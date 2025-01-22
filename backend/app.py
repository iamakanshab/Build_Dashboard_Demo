from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database connection configuration
DB_CONFIG = {
    'SERVER': os.getenv('AZURE_SQL_SERVER'),
    'DATABASE': os.getenv('AZURE_SQL_DATABASE'),
    'USERNAME': os.getenv('AZURE_SQL_USERNAME'),
    'PASSWORD': os.getenv('AZURE_SQL_PASSWORD'),
    'DRIVER': '{ODBC Driver 17 for SQL Server}'
}

def get_db_connection():
    conn_str = (
        f"DRIVER={DB_CONFIG['DRIVER']};"
        f"SERVER={DB_CONFIG['SERVER']};"
        f"DATABASE={DB_CONFIG['DATABASE']};"
        f"UID={DB_CONFIG['USERNAME']};"
        f"PWD={DB_CONFIG['PASSWORD']}"
    )
    return pyodbc.connect(conn_str)

@app.route('/api/metrics/dashboard', methods=['GET'])
def get_dashboard_metrics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get date range for last 7 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        # Fetch daily commit data
        cursor.execute("""
            SELECT 
                CONVERT(date, createtime) as date,
                COUNT(*) as total,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN is_flaky = 1 THEN 1 ELSE 0 END) as flaky
            FROM workflow_runs
            WHERE createtime BETWEEN ? AND ?
            GROUP BY CONVERT(date, createtime)
            ORDER BY date
        """, (start_date, end_date))
        
        chart_data = []
        for row in cursor.fetchall():
            chart_data.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'total': row.total,
                'failed': row.failed,
                'flaky': row.flaky
            })

        # Fetch queue data
        cursor.execute("""
            SELECT 
                machine_type,
                COUNT(*) as count,
                AVG(queue_time) as avg_queue_time
            FROM queued_jobs
            WHERE status = 'queued'
            GROUP BY machine_type
        """)
        
        queue_data = []
        for row in cursor.fetchall():
            queue_time_hours = row.avg_queue_time / 3600  # Convert seconds to hours
            queue_data.append({
                'machineType': row.machine_type,
                'count': row.count,
                'queueTime': f"{queue_time_hours:.1f}h"
            })

        # Fetch overall metrics
        cursor.execute("""
            SELECT
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflow_runs), 0) AS DECIMAL(5,1))
                FROM workflow_runs WHERE conclusion = 'failure' AND is_flaky = 0) as red_on_main,
                
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflow_runs), 0) AS DECIMAL(5,1))
                FROM workflow_runs WHERE is_flaky = 1) as red_on_main_flaky,
                
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM pull_requests), 0) AS DECIMAL(5,1))
                FROM pull_requests WHERE force_merged = 1 AND failed_checks = 1) as force_merges_failed,
                
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM pull_requests), 0) AS DECIMAL(5,1))
                FROM pull_requests WHERE force_merged = 1 AND impatient_merge = 1) as force_merges_impatience,
                
                (SELECT AVG(time_to_red_signal) FROM workflow_runs WHERE conclusion = 'failure') as avg_ttrs,
                
                (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY time_to_red_signal) 
                FROM workflow_runs WHERE conclusion = 'failure') as p75_ttrs,
                
                (SELECT time_diff FROM viable_strict_status WHERE id = (SELECT MAX(id) FROM viable_strict_status)) as viable_strict_lag,
                
                (SELECT last_push_time FROM main_branch_status) as last_main_push,
                
                (SELECT last_build_time FROM docker_builds WHERE status = 'success') as last_docker_build,
                
                (SELECT COUNT(*) FROM revert_commits WHERE createtime >= DATEADD(day, -7, GETDATE())) as reverts,
                
                (SELECT AVG(time_to_status) FROM pull_requests WHERE merged = 1) as pull_trunk_tts
        """)
        
        metrics_row = cursor.fetchone()
        metrics = {
            'redOnMain': str(metrics_row.red_on_main),
            'redOnMainFlaky': str(metrics_row.red_on_main_flaky),
            'forceMergesFailed': str(metrics_row.force_merges_failed),
            'forceMergesImpatience': str(metrics_row.force_merges_impatience),
            'timeToRedSignal': str(round(metrics_row.avg_ttrs)),
            'timeToRedSignalP75': str(round(metrics_row.p75_ttrs)),
            'viableStrictLag': f"{metrics_row.viable_strict_lag / 3600:.1f}h",
            'lastMainPush': f"{(datetime.now() - metrics_row.last_main_push).total_seconds() / 60:.1f}m",
            'lastDockerBuild': f"{(datetime.now() - metrics_row.last_docker_build).total_seconds() / 3600:.1f}h",
            'reverts': str(metrics_row.reverts),
            'pullTrunkTTS': f"{metrics_row.pull_trunk_tts / 3600:.1f}h"
        }

        conn.close()
        
        return jsonify({
            'chartData': chart_data,
            'queueData': queue_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)
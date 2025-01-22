from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import pyodbc
from functools import wraps
import os
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)

# Enhanced logging setup
logging.basicConfig(level=logging.DEBUG)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
app.logger.addHandler(handler)

# Print environment variables at startup
app.logger.info("Environment variables check:")
app.logger.info(f"DB_PASSWORD set: {'DB_PASSWORD' in os.environ}")

# Database configuration
def get_db_connection(pwd):
    try:
        server = 'dashboard-backend.database.windows.net'
        database = 'dashboard-backend'
        username = 'CloudSA9134000b'
        driver = '{ODBC Driver 17 for SQL Server}'
        
        app.logger.debug("Building connection string...")
        connection = pyodbc.connect(
            f'DRIVER={driver};SERVER={server};PORT=1433;DATABASE={database};UID={username};PWD={pwd}'
        )
        app.logger.info("Database connection successful")
        return connection
    except Exception as e:
        app.logger.error(f"Database connection error: {str(e)}")
        raise

# Database connection middleware
def require_db_connection(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            #db_password = os.getenv('DB_PASSWORD')
            db_password = 'BackendPassw0rd'
            if not db_password:
                app.logger.error("Database password not configured")
                return jsonify({'error': 'Database password not configured'}), 500
            
            app.logger.debug("Attempting database connection...")
            conn = get_db_connection(db_password)
            result = f(conn, *args, **kwargs)
            conn.close()
            app.logger.debug("Connection closed successfully")
            return result
        except Exception as e:
            app.logger.error(f"Database error: {str(e)}")
            return jsonify({'error': 'Database connection failed'}), 500
    return decorated_function

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/test-connection', methods=['GET'])
@require_db_connection
def test_connection(conn):
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        result = cursor.fetchone()
        return jsonify({
            'status': 'success',
            'message': 'Connection successful',
            'result': result[0]
        })
    except Exception as e:
        app.logger.error(f"Test connection failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Connection failed: {str(e)}'
        }), 500

@app.route('/api/metrics/dashboard', methods=['GET'])
@require_db_connection
def get_dashboard_metrics(conn):
    try:
        cursor = conn.cursor()
        
        # Get date range for last 7 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        app.logger.debug(f"Query date range: {start_date} to {end_date}")

        # Fetch daily workflow data
        app.logger.debug("Executing daily workflow query...")
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
        app.logger.debug(f"Retrieved {len(chart_data)} days of workflow data")

        # Fetch current queue status
        app.logger.debug("Executing queue status query...")
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
            queue_time_hours = row.avg_queue_time / 3600
            queue_data.append({
                'machineType': row.machine_type,
                'count': row.count,
                'queueTime': f"{queue_time_hours:.1f}h"
            })
        app.logger.debug(f"Retrieved queue data for {len(queue_data)} machine types")

        # Fetch key metrics
        app.logger.debug("Executing metrics query...")
        cursor.execute("""
            SELECT
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflow_runs), 0) AS DECIMAL(5,1))
                FROM workflow_runs WHERE conclusion = 'failure' AND is_flaky = 0) as red_on_main,
                
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflow_runs), 0) AS DECIMAL(5,1))
                FROM workflow_runs WHERE is_flaky = 1) as red_on_main_flaky,
                
                (SELECT AVG(time_to_red_signal) FROM workflow_runs WHERE conclusion = 'failure') as avg_ttrs,
                
                (SELECT time_diff FROM viable_strict_status WHERE id = (SELECT MAX(id) FROM viable_strict_status)) as viable_strict_lag,
                
                (SELECT last_push_time FROM main_branch_status) as last_main_push,
                
                (SELECT last_build_time FROM docker_builds WHERE status = 'success') as last_docker_build
        """)
        
        metrics_row = cursor.fetchone()
        metrics = {
            'redOnMain': str(metrics_row.red_on_main or 0),
            'redOnMainFlaky': str(metrics_row.red_on_main_flaky or 0),
            'timeToRedSignal': str(round(metrics_row.avg_ttrs or 0)),
            'viableStrictLag': f"{(metrics_row.viable_strict_lag or 0) / 3600:.1f}h",
            'lastMainPush': f"{(datetime.now() - (metrics_row.last_main_push or datetime.now())).total_seconds() / 60:.1f}m",
            'lastDockerBuild': f"{(datetime.now() - (metrics_row.last_docker_build or datetime.now())).total_seconds() / 3600:.1f}h"
        }
        app.logger.debug("Successfully retrieved metrics data")

        return jsonify({
            'chartData': chart_data,
            'queueData': queue_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/metrics/workflow-runs', methods=['GET'])
@require_db_connection
def get_workflow_runs(conn):
    try:
        days = request.args.get('days', default=7, type=int)
        cursor = conn.cursor()
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        app.logger.debug(f"Fetching workflow runs from {start_date} to {end_date}")
        
        cursor.execute("""
            SELECT 
                workflow_id,
                createtime,
                conclusion,
                is_flaky,
                time_to_red_signal
            FROM workflow_runs
            WHERE createtime BETWEEN ? AND ?
            ORDER BY createtime DESC
        """, (start_date, end_date))
        
        runs = []
        for row in cursor.fetchall():
            runs.append({
                'workflowId': row.workflow_id,
                'createTime': row.createtime.isoformat(),
                'conclusion': row.conclusion,
                'isFlaky': bool(row.is_flaky),
                'timeToRedSignal': row.time_to_red_signal
            })
        
        app.logger.debug(f"Retrieved {len(runs)} workflow runs")
        return jsonify(runs)

    except Exception as e:
        app.logger.error(f"Workflow runs error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/metrics/queue-status', methods=['GET'])
@require_db_connection
def get_queue_status(conn):
    try:
        cursor = conn.cursor()
        app.logger.debug("Fetching queue status")
        
        cursor.execute("""
            SELECT 
                machine_type,
                status,
                COUNT(*) as count,
                AVG(queue_time) as avg_queue_time
            FROM queued_jobs
            GROUP BY machine_type, status
        """)
        
        status_data = []
        for row in cursor.fetchall():
            status_data.append({
                'machineType': row.machine_type,
                'status': row.status,
                'count': row.count,
                'averageQueueTime': f"{row.avg_queue_time / 3600:.1f}h"
            })
        
        app.logger.debug(f"Retrieved status data for {len(status_data)} machine types")
        return jsonify(status_data)

    except Exception as e:
        app.logger.error(f"Queue status error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.logger.info("Starting Flask application...")
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    app.run(host='0.0.0.0', port=port, debug=debug)
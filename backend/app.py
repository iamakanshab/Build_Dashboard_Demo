from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import mysql.connector
import os
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.DEBUG)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

# Database configuration
db_config = {
    'host': 'shark-dashboard-db.c3kwuosg6kjs.us-east-2.rds.amazonaws.com',
    'user': 'admin',
    'password': 'pwd',
    'database': 'shark_dashboard_db',
    'port': 3306
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Exception as e:
        app.logger.error(f"Database connection error: {str(e)}")
        raise

@app.route('/api/metrics/dashboard', methods=['GET'])
def get_dashboard_metrics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get daily workflow statistics for the past 7 days
        cursor.execute("""
            SELECT 
                DATE(createtime) as date,
                COUNT(*) as total,
                SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND branchname = 'main'
            GROUP BY DATE(createtime)
            ORDER BY date DESC
        """)
        
        daily_data = cursor.fetchall()
        
        # Calculate red on main percentage (last 24 hours)
        cursor.execute("""
            SELECT 
                COUNT(*) as total_runs,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed_runs
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND branchname = 'main'
        """)
        
        total_stats = cursor.fetchone()
        red_on_main = (total_stats['failed_runs'] / total_stats['total_runs'] * 100) if total_stats['total_runs'] > 0 else 0
        
        # Get last push time
        cursor.execute("""
            SELECT createtime 
            FROM workflowruns 
            WHERE branchname = 'main'
            ORDER BY createtime DESC 
            LIMIT 1
        """)
        
        latest_run = cursor.fetchone()
        last_push = "N/A"
        if latest_run:
            time_diff = datetime.now() - latest_run['createtime']
            if time_diff.days > 0:
                last_push = f"{time_diff.days}d"
            elif time_diff.seconds >= 3600:
                last_push = f"{time_diff.seconds // 3600}h"
            else:
                last_push = f"{time_diff.seconds // 60}m"

        # Format chart data
        chart_data = [{
            'date': row['date'].strftime('%Y-%m-%d'),
            'Success': int(row['success'] or 0),
            'Failed': int(row['failed'] or 0),
            'total': int(row['total'] or 0)
        } for row in daily_data]

        metrics = {
            'redOnMain': f"{red_on_main:.1f}",
            'redOnMainFlaky': "0.0",  # Placeholder for flaky test metric
            'lastMainPush': last_push,
            'lastDockerBuild': "N/A"  # Placeholder for docker build time
        }

        cursor.close()
        conn.close()

        return jsonify({
            'chartData': chart_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Dashboard metrics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics/workflow-runs', methods=['GET'])
def get_workflow_runs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        days = request.args.get('days', default=7, type=int)
        repo_filter = request.args.get('repo', default=None)
        
        # Main query with common table expression for grouped runs
        query = """
            WITH grouped_runs AS (
                SELECT 
                    DATE(wr.createtime) as run_date,
                    wr.commithash,
                    wr.repo,
                    wr.gitid as workflow_id,
                    wr.author,
                    wr.branchname,
                    c.message as commit_message,
                    wr.createtime
                FROM workflowruns wr
                LEFT JOIN commits c ON wr.commithash = c.hash AND wr.repo = c.repo
                WHERE wr.createtime >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE(wr.createtime), wr.commithash, wr.repo
            )
            SELECT 
                gr.*,
                MAX(CASE WHEN w.os = 'linux' THEN w.conclusion END) as linux_status,
                MAX(CASE WHEN w.os = 'windows' THEN w.conclusion END) as windows_status,
                MAX(CASE WHEN w.os = 'macos' THEN w.conclusion END) as macos_status,
                MAX(CASE WHEN w.workflowname LIKE '%doc%' THEN w.conclusion END) as doc_status,
                MAX(CASE WHEN w.workflowname LIKE '%lint%' THEN w.conclusion END) as lint_status,
                MAX(CASE WHEN w.workflowname LIKE '%test%' THEN w.conclusion END) as test_status
            FROM grouped_runs gr
            LEFT JOIN workflowruns w ON gr.commithash = w.commithash AND gr.repo = w.repo
            WHERE 1=1
        """
        
        params = [days]
        
        if repo_filter and repo_filter != 'all':
            query += " AND gr.repo = %s"
            params.append(repo_filter)
            
        query += " GROUP BY gr.workflow_id, gr.createtime ORDER BY gr.createtime DESC"
        
        cursor.execute(query, params)
        runs = []
        
        for row in cursor.fetchall():
            run = {
                'workflowId': str(row['workflow_id']),
                'createTime': row['createtime'].isoformat() if row['createtime'] else None,
                'repo': row['repo'],
                'commitMessage': row['commit_message'] or '',
                'author': row['author'],
                'results': {
                    'Linux': map_status(row['linux_status']),
                    'Win': map_status(row['windows_status']),
                    'Mac': map_status(row['macos_status']),
                    'Doc': map_status(row['doc_status']),
                    'Lint': map_status(row['lint_status']),
                    'Test': map_status(row['test_status'])
                }
            }
            runs.append(run)

        cursor.close()
        conn.close()
        return jsonify(runs)

    except Exception as e:
        app.logger.error(f"Workflow runs error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def map_status(status):
    """Map workflow status to display characters"""
    if status == 'success':
        return 'O'
    elif status == 'failure':
        return 'X'
    return '?'

if __name__ == '__main__':
    app.logger.info("Starting Flask application...")
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
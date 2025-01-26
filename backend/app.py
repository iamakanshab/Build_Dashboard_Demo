from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import mysql.connector
import os
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

db_config = {
    'host': 'shark-dashboard-db.c3kwuosg6kjs.us-east-2.rds.amazonaws.com',
    'user': 'admin',
    'password': 'pwd',
    'database': 'shark_dashboard_db',
    'port': 3306
}

@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

@app.route('/api/metrics/dashboard', methods=['GET'])
def get_dashboard_metrics():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                DATE(createtime) as date,
                COUNT(*) as total,
                SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(createtime)
            ORDER BY date DESC
        """)
        
        daily_data = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_runs,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed_runs
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        """)
        
        total_stats = cursor.fetchone()
        red_on_main = (total_stats['failed_runs'] / total_stats['total_runs'] * 100) if total_stats['total_runs'] > 0 else 0
        
        cursor.execute("""
            SELECT createtime 
            FROM workflowruns 
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

        chart_data = [{
            'date': row['date'].strftime('%Y-%m-%d'),
            'Success': int(row['success'] or 0),
            'Failed': int(row['failed'] or 0),
            'total': int(row['total'] or 0)
        } for row in daily_data]

        metrics = {
            'redOnMain': f"{red_on_main:.1f}",
            'redOnMainFlaky': "0.0",
            'lastMainPush': last_push,
            'lastDockerBuild': "N/A"
        }

        cursor.close()
        conn.close()

        return jsonify({
            'chartData': chart_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def mapStatus(status):
    if status == 'success':
        return 'O'
    elif status == 'failure':
        return 'X'
    return '?'

@app.route('/api/metrics/workflow-runs', methods=['GET'])
def get_workflowruns():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        days = request.args.get('days', default=7, type=int)
        repo_filter = request.args.get('repo', default=None)
        query = """
            WITH grouped_runs AS (
                SELECT 
                    DATE(createtime) as run_date,
                    commithash,
                    repo,
                    MAX(conclusion) as overall_conclusion,
                    MAX(gitid) as workflow_id,
                    MAX(author) as author,
                    MAX(branchname) as branchname
                FROM workflowruns 
                GROUP BY DATE(createtime), commithash, repo
            )
            SELECT 
                gr.workflow_id,
                gr.run_date as createtime,
                MAX(CASE WHEN w1.os = 'linux' THEN w1.conclusion END) as linux_status,
                MAX(CASE WHEN w1.os = 'windows' THEN w1.conclusion END) as windows_status,
                MAX(CASE WHEN w1.os = 'macos' THEN w1.conclusion END) as macos_status,
                MAX(CASE WHEN w1.workflowname LIKE '%doc%' THEN w1.conclusion END) as doc_status,
                MAX(CASE WHEN w1.workflowname LIKE '%lint%' THEN w1.conclusion END) as lint_status,
                MAX(CASE WHEN w1.workflowname LIKE '%test%' THEN w1.conclusion END) as test_status,
                gr.repo,
                c.message as commit_message,
                gr.author,
                gr.branchname
            FROM grouped_runs gr
            LEFT JOIN workflowruns w1 ON gr.commithash = w1.commithash 
                AND gr.repo = w1.repo 
                AND DATE(gr.run_date) = DATE(w1.createtime)
            LEFT JOIN commits c ON gr.commithash = c.hash
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        params = [days]
        
        if repo_filter and repo_filter != 'all':
            query += " AND repo = %s"
            params.append(repo_filter)
            
        query += " ORDER BY createtime DESC"
        
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
                    'Linux': mapStatus(row['linux_status']),
                    'Win': mapStatus(row['windows_status']),
                    'Mac': mapStatus(row['macos_status']),
                    'Doc': mapStatus(row['doc_status']),
                    'Lint': mapStatus(row['lint_status']),
                    'Test': mapStatus(row['test_status'])
                }
            }
            runs.append(run)
        
        cursor.close()
        conn.close()
        return jsonify(runs)
        
    except Exception as e:
        app.logger.error(f"Error fetching workflow runs: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.logger.info("Starting Flask application...")
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
from flask import Flask, jsonify, request, send_from_directory
from datetime import datetime, timedelta
import mysql.connector
import os
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__, static_folder='build', static_url_path='')

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
        """)
        
        total_stats = cursor.fetchone()
        red_on_main = (total_stats['failed_runs'] / total_stats['total_runs'] * 100) if total_stats['total_runs'] > 0 else 0
        
        # Get last push time
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

        # Format chart data
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
        app.logger.error(f"Dashboard metrics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics/workflowruns', methods=['GET'])
def get_workflow_runs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        days = request.args.get('days', default=7, type=int)
        repo_filter = request.args.get('repo', default=None)
        branch_filter = request.args.get('branch', default='main', type=str)
        
        # Updated query to properly handle workflow runs and commits
        query = """
            SELECT 
                wr.id as workflow_id,
                wr.gitid,
                wr.commithash,
                wr.author,
                wr.createtime,
                wr.repo,
                wr.branchname,
                wr.workflowname,
                wr.os,
                wr.conclusion,
                wr.url as workflow_url,
                c.message as commit_message
            FROM workflowruns wr
            LEFT JOIN commits c ON wr.commithash = c.hash AND wr.repo = c.repo
            WHERE wr.createtime >= DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        
        params = [days]
        
        if repo_filter and repo_filter != 'all':
            query += " AND wr.repo = %s"
            params.append(repo_filter)
        
        if branch_filter:
            query += " AND wr.branchname = %s"
            params.append(branch_filter)
            
        query += """
            ORDER BY wr.createtime DESC
        """
        
        cursor.execute(query, params)
        
        runs = []
        for row in cursor.fetchall():
            # Initialize default results
            results = {
                'Linux': '?', 'Win': '?', 'Mac': '?', 
                'Doc': '?', 'Lint': '?', 'Test': '?'
            }
            
            # Parse concatenated results
            if row['os']:
                key = row['os']
                if key.lower() == 'windows':
                    key = 'Win'
                elif key.lower() == 'macos':
                    key = 'Mac'
                
                if key in results:
                    results[key] = 'O' if row['conclusion'] == 'success' else ('X' if row['conclusion'] == 'failure' else '?')
            
            # Also check for special workflow types
            if row['workflowname']:
                if 'doc' in row['workflowname'].lower():
                    results['Doc'] = 'O' if row['conclusion'] == 'success' else ('X' if row['conclusion'] == 'failure' else '?')
                elif 'lint' in row['workflowname'].lower():
                    results['Lint'] = 'O' if row['conclusion'] == 'success' else ('X' if row['conclusion'] == 'failure' else '?')
                elif 'test' in row['workflowname'].lower():
                    results['Test'] = 'O' if row['conclusion'] == 'success' else ('X' if row['conclusion'] == 'failure' else '?')

            run = {
                'workflowId': str(row['workflow_id']),
                'gitid': str(row['gitid']),
                'commitHash': str(row['commithash']),
                'createTime': row['createtime'].isoformat() if row['createtime'] else None,
                'repo': row['repo'],
                'branch': row['branchname'],
                'commitMessage': row['commit_message'] or '',
                'author': row['author'],
                'workflowUrl': row['workflow_url'],
                'workflowname': row['workflowname'],
                'conclusion': row['conclusion'],
                'os': row['os'],
                'results': results
            }
            runs.append(run)

        cursor.close()
        conn.close()
        
        app.logger.info(f"Returning {len(runs)} workflow runs")
        return jsonify(runs)

    except Exception as e:
        app.logger.error(f"Workflow runs error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/db-schema')
def db_schema():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get column information for workflowruns table
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'workflowruns'
            AND TABLE_SCHEMA = 'shark_dashboard_db'
        """)
        
        columns = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(columns)
    except Exception as e:
        return jsonify({"error": str(e)})
    
# Serve React App - root path
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

# Catch all routes to handle React Router
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.logger.info("Starting Flask application...")
    port = int(os.getenv('PORT', 80))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
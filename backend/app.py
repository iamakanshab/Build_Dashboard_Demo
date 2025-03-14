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
        
        # Updated query to properly handle workflow runs and commits
        query = """
            SELECT 
                wr.id as workflow_id,
                wr.gitid as commit_hash,
                wr.author,
                wr.createtime,
                wr.repo,
                wr.branchname,
                c.message as commit_message,
                GROUP_CONCAT(
                    DISTINCT
                    CONCAT(
                        CASE 
                            WHEN wr.os IS NOT NULL THEN wr.os
                            WHEN wr.workflowname LIKE '%doc%' THEN 'Doc'
                            WHEN wr.workflowname LIKE '%lint%' THEN 'Lint'
                            WHEN wr.workflowname LIKE '%test%' THEN 'Test'
                        END,
                        ':',
                        CASE WHEN wr.conclusion = 'success' THEN 'O'
                             WHEN wr.conclusion = 'failure' THEN 'X'
                             ELSE '?' END
                    )
                    ORDER BY wr.createtime DESC
                ) as result_data
            FROM workflowruns wr
            LEFT JOIN commits c ON wr.commithash = c.hash AND wr.repo = c.repo
            WHERE wr.createtime >= DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        
        params = [days]
        
        if repo_filter and repo_filter != 'all':
            query += " AND wr.repo = %s"
            params.append(repo_filter)
            
        query += """
            GROUP BY 
                wr.id, 
                wr.gitid,
                wr.author,
                wr.createtime,
                wr.repo,
                wr.branchname,
                c.message 
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
            if row['result_data']:
                for result in row['result_data'].split(','):
                    key, value = result.split(':')
                    if key.lower() == 'windows':
                        key = 'Win'
                    elif key.lower() == 'macos':
                        key = 'Mac'
                    if key in results:
                        results[key] = value

            run = {
                'workflowId': str(row['workflow_id']),
                'commitHash': str(row['commit_hash']),
                'createTime': row['createtime'].isoformat() if row['createtime'] else None,
                'repo': row['repo'],
                'branch': row['branchname'],
                'commitMessage': row['commit_message'] or '',
                'author': row['author'],
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

@app.route('/api/test-db')
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check total count of workflowruns
        cursor.execute("SELECT COUNT(*) as total FROM workflowruns")
        count_result = cursor.fetchone()
        
        # Check the most recent records
        cursor.execute("SELECT id, gitid, author, createtime, repo FROM workflowruns ORDER BY createtime DESC LIMIT 5")
        sample_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "connected",
            "total_records": count_result['total'],
            "sample_data": sample_data
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    
@app.route('/api/test-simple-query')
def test_simple_query():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Simpler query without complex joins or GROUP BY
        cursor.execute("""
            SELECT 
                id, gitid, author, createtime, repo, branchname, workflowname
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            LIMIT 10
        """)
        
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        app.logger.info(f"Simple query returned {len(results)} rows")
        return jsonify(results)
    except Exception as e:
        app.logger.error(f"Simple query error: {str(e)}")
        return jsonify({"error": str(e)})

@app.route('/api/test-dates')
def test_dates():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get the server's current time
        cursor.execute("SELECT NOW() as server_time")
        server_time = cursor.fetchone()
        
        # Get min and max dates in the workflowruns table
        cursor.execute("SELECT MIN(createtime) as min_date, MAX(createtime) as max_date FROM workflowruns")
        date_range = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Include Python's datetime for comparison
        from datetime import datetime
        python_now = datetime.now()
        
        return jsonify({
            "server_time": server_time['server_time'].isoformat() if server_time else None,
            "python_time": python_now.isoformat(),
            "min_date": date_range['min_date'].isoformat() if date_range and date_range['min_date'] else None,
            "max_date": date_range['max_date'].isoformat() if date_range and date_range['max_date'] else None
        })
    except Exception as e:
        return jsonify({"error": str(e)})

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
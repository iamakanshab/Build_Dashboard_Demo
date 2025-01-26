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
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({"status": "connected", "result": result[0]})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)}), 500

@app.route('/api/metrics/dashboard', methods=['GET'])
def get_dashboard_metrics():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Get daily metrics
        cursor.execute("""
            SELECT 
                DATE(createtime) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN conclusion = 'failure' THEN 1 END) as failed,
                COUNT(CASE WHEN conclusion = 'success' THEN 1 END) as success
            FROM workflowruns
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(createtime)
            ORDER BY date
        """)
        
        chart_data = [
            {
                'date': row['date'].strftime('%Y-%m-%d'),
                'Success': int(row['success'] or 0),
                'Failed': int(row['failed'] or 0),
                'total': int(row['total'] or 0)
            }
            for row in cursor.fetchall()
        ]

        # Get metrics data
        cursor.execute("""
            SELECT
                COUNT(*) as total_runs,
                COUNT(CASE WHEN conclusion = 'failure' THEN 1 END) as failed_runs
            FROM workflowruns
        """)
        
        counts = cursor.fetchone()
        failure_rate = (counts['failed_runs'] / counts['total_runs'] * 100) if counts['total_runs'] > 0 else 0
        
        metrics = {
            'redOnMain': f"{failure_rate:.1f}",
            'redOnMainFlaky': "0.0",
            'lastMainPush': "10m",
            'lastDockerBuild': "2.5h"
        }

        return jsonify({
            'chartData': chart_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics/workflow-runs', methods=['GET'])
def get_workflowruns():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        days = request.args.get('days', default=7, type=int)
        repo = request.args.get('repo', default=None)
        
        query = """
            SELECT 
                gitid as workflow_id,
                createtime,
                conclusion,
                runtime as time_to_red_signal,
                wr.repo,
                c.message as commit_message,
                wr.author,
                NULL as pr_number
            FROM workflowruns wr
            LEFT JOIN commits c ON wr.commithash = c.hash
            WHERE createtime >= DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        params = [days]
        
        if repo and repo != 'all':
            query += " AND wr.repo = %s"
            params.append(repo)
            
        query += " ORDER BY createtime DESC"
        
        cursor.execute(query, params)
        runs = [
            {
                'workflowId': row['workflow_id'],
                'createTime': row['createtime'].isoformat(),
                'conclusion': row['conclusion'],
                'timeToRedSignal': row['time_to_red_signal'],
                'repo': row['repo'],
                'commitMessage': row['commit_message'],
                'author': row['author'],
                'prNumber': row['pr_number']
            }
            for row in cursor.fetchall()
        ]
        
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
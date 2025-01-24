from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import pyodbc
from functools import wraps
import os
import logging
from logging.handlers import RotatingFileHandler

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('ODBC')

app = Flask(__name__)
CORS(app)
connection_string = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=dashboard-backend.database.windows.net,1433;"
    "Database=dashboard-backend;"
    "UID=CloudSA9134000b;"
    "PWD=BackendPassw0rd;"
    "Connect_Timeout=30;"
    "Login_Timeout=30;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
)

# Enhanced logging setup
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

def get_db_connection(pwd):
    try:
        app.logger.debug("Starting connection attempt...")
        app.logger.debug(f"Using driver versions: {[x for x in pyodbc.drivers() if 'SQL Server' in x]}")
        
        debug_conn_string = connection_string.replace(pwd, '***')
        app.logger.debug(f"Connection string (masked): {debug_conn_string}")
        
        connection = pyodbc.connect(connection_string, timeout=30)
        app.logger.debug("Connection successful")
        return connection
    except pyodbc.Error as e:
        app.logger.error(f"Detailed connection error: {str(e)}")
        app.logger.error(f"Error state: {e.args[0]}")
        raise

def require_db_connection(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            db_password = 'BackendPassw0rd'
            if not db_password:
                app.logger.error("Database password not configured")
                return jsonify({'error': 'Database password not configured'}), 500
            
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
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        cursor.execute("""
            SELECT 
                CONVERT(date, createtime) as date,
                COUNT(*) as total,
                SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed
            FROM workflowruns
            WHERE createtime BETWEEN ? AND ?
            GROUP BY CONVERT(date, createtime)
            ORDER BY date
        """, (start_date, end_date))
        
        chart_data = []
        for row in cursor.fetchall():
            chart_data.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'total': row.total,
                'failed': row.failed
            })

        cursor.execute("""
            SELECT
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflowruns), 0) AS DECIMAL(5,1))
                FROM workflowruns WHERE conclusion = 'failure') as red_on_main,
                
                (SELECT CAST(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM workflowruns), 0) AS DECIMAL(5,1))
                FROM workflowruns) as red_on_main_flaky,
                
                (SELECT c.time
                FROM commits c
                ORDER BY c.time DESC
                LIMIT 1) as last_main_push,
                
                (SELECT wr.createtime 
                FROM workflowruns wr
                WHERE wr.conclusion = 'success'
                ORDER BY wr.createtime DESC
                LIMIT 1) as last_docker_build
        """)
        
        metrics_row = cursor.fetchone()
        metrics = {
            'redOnMain': str(metrics_row.red_on_main or 0),
            'redOnMainFlaky': str(metrics_row.red_on_main_flaky or 0),
            'lastMainPush': f"{(datetime.now() - (metrics_row.last_main_push or datetime.now())).total_seconds() / 60:.1f}m",
            'lastDockerBuild': f"{(datetime.now() - (metrics_row.last_docker_build or datetime.now())).total_seconds() / 3600:.1f}h"
        }

        return jsonify({
            'chartData': chart_data,
            'metrics': metrics
        })

    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/metrics/workflow-runs', methods=['GET'])
@require_db_connection
def get_workflowruns(conn):
    try:
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
            WHERE createtime >= DATEADD(day, -?, GETDATE())
        """
        params = [days]
        
        if repo and repo != 'all':
            query += " AND wr.repo = ?"
            params.append(repo)
            
        query += " ORDER BY createtime DESC"
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        runs = []
        for row in cursor.fetchall():
            runs.append({
                'workflowId': row.workflow_id,
                'createTime': row.createtime.isoformat(),
                'conclusion': row.conclusion,
                'timeToRedSignal': row.time_to_red_signal,
                'repo': row.repo,
                'commitMessage': row.commit_message,
                'author': row.author,
                'prNumber': row.pr_number
            })
        
        return jsonify(runs)
    except Exception as e:
        app.logger.error(f"Error fetching workflow runs: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.logger.info("Starting Flask application...")
    try:
        test_conn = pyodbc.connect(connection_string)
        test_conn.close()
        app.logger.info("Initial database connection test successful")
    except pyodbc.Error as e:
        app.logger.error(f"Initial database connection test failed: {str(e)}")
    
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
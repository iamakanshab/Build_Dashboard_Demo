# app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import datetime
import time
import os

class Dashboard:
    def __init__(self, db_file, repo, port=5000):
        self.repo_path = repo
        self.app = Flask(__name__, static_folder='../frontend/build')
        CORS(self.app)
        self.db_file = db_file
        self.port = port
        self._register_routes()

    def _get_db_connection(self):
        """Create a database connection"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row  # This enables name-based access to columns
        return conn

    def _register_routes(self):
        @self.app.route('/api/waterfall')
        def get_waterfall_data():
            try:
                conn = self._get_db_connection()
                c = conn.cursor()
                
                # Get unique workflows
                c.execute("""
                    SELECT DISTINCT name 
                    FROM workflows 
                    WHERE repo = ? 
                    ORDER BY name
                """, (self.repo_path,))
                workflows = [row['name'] for row in c.fetchall()]
                
                # Get recent commits and their workflow runs
                c.execute("""
                    SELECT 
                        c.hash,
                        c.message,
                        c.author,
                        c.time as created_at,
                        w.name as workflow_name,
                        wr.status,
                        wr.conclusion,
                        wr.url,
                        wr.runtime,
                        wr.queuetime
                    FROM commits c
                    LEFT JOIN workflowruns wr ON c.id = wr.commitid
                    LEFT JOIN workflows w ON wr.workflow = w.id
                    WHERE c.repo = ? AND c.time > ?
                    ORDER BY c.time DESC
                """, (self.repo_path, time.time() - 86400))  # Last 24 hours
                
                rows = c.fetchall()
                commits = {}
                
                for row in rows:
                    sha = row['hash']
                    if sha not in commits:
                        commits[sha] = {
                            'sha': sha,
                            'title': row['message'],
                            'author': row['author'],
                            'time': datetime.datetime.fromtimestamp(row['created_at']).strftime('%I:%M %p'),
                            'url': row['url'],
                            'results': {}
                        }
                    if row['workflow_name']:
                        commits[sha]['results'][row['workflow_name']] = {
                            'status': row['status'],
                            'conclusion': row['conclusion'],
                            'runtime': row['runtime'],
                            'queuetime': row['queuetime']
                        }
                
                return jsonify({
                    'workflows': workflows,
                    'commits': list(commits.values())
                })
            
            except Exception as e:
                print(f"Error fetching waterfall data: {e}")
                return jsonify({'error': str(e)}), 500
            
            finally:
                conn.close()

        @self.app.route('/api/stats')
        def get_stats():
            try:
                conn = self._get_db_connection()
                c = conn.cursor()
                
                stats = {}
                
                # Get counts
                for table in ['commits', 'workflows', 'workflowruns']:
                    c.execute(f"SELECT COUNT(*) as count FROM {table} WHERE repo = ?", 
                            (self.repo_path,))
                    result = c.fetchone()
                    stats[f'{table}_count'] = result['count']
                
                # Get success rate
                c.execute("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successes
                    FROM workflowruns
                    WHERE repo = ? AND conclusion IS NOT NULL
                """, (self.repo_path,))
                result = c.fetchone()
                total = result['total']
                successes = result['successes'] or 0
                stats['success_rate'] = (successes / total * 100) if total > 0 else 0

                # Get average runtimes
                c.execute("""
                    SELECT 
                        AVG(runtime) as avg_runtime,
                        AVG(queuetime) as avg_queuetime
                    FROM workflowruns
                    WHERE repo = ? AND conclusion IS NOT NULL
                """, (self.repo_path,))
                result = c.fetchone()
                stats['avg_runtime'] = result['avg_runtime'] or 0
                stats['avg_queuetime'] = result['avg_queuetime'] or 0
                
                return jsonify(stats)
            
            except Exception as e:
                print(f"Error fetching stats: {e}")
                return jsonify({'error': str(e)}), 500
            
            finally:
                conn.close()

        @self.app.route('/api/workflow-summary')
        def get_workflow_summary():
            try:
                conn = self._get_db_connection()
                c = conn.cursor()
                
                # Get summary per workflow
                c.execute("""
                    SELECT 
                        w.name,
                        COUNT(*) as total_runs,
                        SUM(CASE WHEN wr.conclusion = 'success' THEN 1 ELSE 0 END) as successes,
                        AVG(wr.runtime) as avg_runtime,
                        AVG(wr.queuetime) as avg_queuetime
                    FROM workflows w
                    LEFT JOIN workflowruns wr ON w.id = wr.workflow
                    WHERE w.repo = ?
                    GROUP BY w.name
                    ORDER BY w.name
                """, (self.repo_path,))
                
                results = []
                for row in c.fetchall():
                    total = row['total_runs']
                    successes = row['successes'] or 0
                    results.append({
                        'name': row['name'],
                        'total_runs': total,
                        'success_rate': (successes / total * 100) if total > 0 else 0,
                        'avg_runtime': row['avg_runtime'] or 0,
                        'avg_queuetime': row['avg_queuetime'] or 0
                    })
                
                return jsonify(results)
            
            except Exception as e:
                print(f"Error fetching workflow summary: {e}")
                return jsonify({'error': str(e)}), 500
            
            finally:
                conn.close()

        @self.app.route('/api/metrics')
        def get_metrics():
            try:
                conn = self._get_db_connection()
                c = conn.cursor()
                
                # Calculate time ranges
                now = time.time()
                seven_days_ago = now - (7 * 24 * 60 * 60)
                
                # Get daily commits and their status
                c.execute("""
                    SELECT 
                        date(datetime(c.time, 'unixepoch')) as commit_date,
                        COUNT(*) as total_commits,
                        SUM(CASE WHEN wr.conclusion = 'failure' THEN 1 ELSE 0 END) as failed_commits
                    FROM commits c
                    LEFT JOIN workflowruns wr ON c.id = wr.commitid
                    WHERE c.time > ? AND c.repo = ?
                    GROUP BY commit_date
                    ORDER BY commit_date
                """, (seven_days_ago, self.repo_path))
                
                daily_commits = [dict(row) for row in c.fetchall()]
                
                # Calculate red on main percentages
                c.execute("""
                    WITH workflow_stats AS (
                        SELECT 
                            c.id,
                            CASE 
                                WHEN wr.conclusion = 'failure' AND w.name LIKE '%strict%' THEN 'broken'
                                WHEN wr.conclusion = 'failure' THEN 'flaky'
                                ELSE 'success'
                            END as status
                        FROM commits c
                        JOIN workflowruns wr ON c.id = wr.commitid
                        JOIN workflows w ON wr.workflow = w.id
                        WHERE c.time > ? AND c.repo = ?
                    )
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'broken' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as broken_percent,
                        SUM(CASE WHEN status = 'flaky' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as flaky_percent
                    FROM workflow_stats
                """, (seven_days_ago, self.repo_path))
                
                trunk_stats = dict(c.fetchone())
                
                # Calculate time to red signal (TTRS)
                c.execute("""
                    WITH failure_times AS (
                        SELECT 
                            wr.createtime,
                            wr.endtime,
                            (wr.endtime - wr.createtime) / 60.0 as detection_time
                        FROM workflowruns wr
                        WHERE wr.conclusion = 'failure'
                        AND wr.createtime > ?
                        AND wr.repo = ?
                    )
                    SELECT
                        AVG(detection_time) as avg_detection_time,
                        MAX(detection_time) as max_detection_time
                    FROM failure_times
                """, (seven_days_ago, self.repo_path))
                
                ttrs = dict(c.fetchone())
                
                metrics = {
                    'daily_commits': daily_commits,
                    'trunk_stats': {
                        'red_on_main_broken': round(trunk_stats['broken_percent'], 1) if trunk_stats['broken_percent'] else 0,
                        'red_on_main_flaky': round(trunk_stats['flaky_percent'], 1) if trunk_stats['flaky_percent'] else 0,
                    },
                    'ttrs': {
                        'avg': round(ttrs['avg_detection_time']) if ttrs['avg_detection_time'] else 0,
                        'max': round(ttrs['max_detection_time']) if ttrs['max_detection_time'] else 0
                    }
                }
                
                return jsonify(metrics)
                
            except Exception as e:
                print(f"Error fetching metrics: {e}")
                return jsonify({'error': str(e)}), 500
                
            finally:
                conn.close()

        @self.app.route('/')
        def serve():
            return send_from_directory(self.app.static_folder, 'index.html')

        @self.app.route('/<path:path>')
        def static_proxy(path):
            return send_from_directory(self.app.static_folder, path)

    def start(self):
        self.app.run(host='0.0.0.0', port=self.port, debug=True)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('-db', '--database', required=True, help="database file path")
    parser.add_argument('-r', '--repo', required=True, help="repository (format: owner/repo)")
    parser.add_argument('-p', '--port', type=int, default=5000, help="port to run on")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.database):
        print("Error: Database file not found.")
        exit(1)
        
    dashboard = Dashboard(args.database, args.repo, args.port)
    dashboard.start()
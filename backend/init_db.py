# init_db.py
import sqlite3
import os
import datetime
import time
import argparse
import json

def init_database(db_file):
    """Initialize the database with required tables"""
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = ON;")

    # Create tables
    tables = [
        """
        CREATE TABLE IF NOT EXISTS repos (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            author TEXT,
            repo TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS commits (
            id INTEGER PRIMARY KEY,
            hash TEXT UNIQUE NOT NULL,
            author TEXT,
            message TEXT,
            time REAL NOT NULL,
            repo TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            url TEXT NOT NULL,
            repo TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS workflowruns (
            id INTEGER PRIMARY KEY,
            branch INTEGER NOT NULL,
            commitid INTEGER NOT NULL,
            workflow INTEGER NOT NULL,
            author TEXT,
            runtime REAL DEFAULT 0.0,
            createtime REAL,
            starttime REAL,
            endtime REAL,
            queuetime REAL DEFAULT 0.0,
            status TEXT,
            conclusion TEXT,
            url TEXT,
            gitid INT UNIQUE,
            archivedbranchname TEXT,
            archivedcommithash TEXT,
            archivedworkflowname TEXT,
            repo TEXT NOT NULL
        )
        """
    ]

    for table in tables:
        c.execute(table)
    
    conn.commit()
    conn.close()

def get_branch_id(cursor, branch_name, repo):
    """Get branch ID or insert if not exists"""
    cursor.execute("SELECT id FROM branches WHERE name = ? AND repo = ?", (branch_name, repo))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    cursor.execute("INSERT INTO branches (name, repo) VALUES (?, ?)", (branch_name, repo))
    return cursor.lastrowid

def get_commit_id(cursor, commit_hash, repo):
    """Get commit ID or return None if not found"""
    cursor.execute("SELECT id FROM commits WHERE hash = ? AND repo = ?", (commit_hash, repo))
    result = cursor.fetchone()
    return result[0] if result else None

def get_workflow_id(cursor, workflow_name, repo):
    """Get workflow ID or return None if not found"""
    cursor.execute("SELECT id FROM workflows WHERE name = ? AND repo = ?", (workflow_name, repo))
    result = cursor.fetchone()
    return result[0] if result else None

def update_database(db_file, repo_name, workflow_data):
    """Update database with provided workflow data"""
    conn = sqlite3.connect(db_file)
    c = conn.cursor()

    try:
        # Insert repo if not exists
        c.execute("INSERT OR IGNORE INTO repos (name) VALUES (?)", (repo_name,))

        # Update branches
        for branch in workflow_data.get('branches', []):
            c.execute(
                "INSERT OR REPLACE INTO branches (name, repo) VALUES (?, ?)",
                (branch['name'], repo_name)
            )

        # Update commits
        for commit in workflow_data.get('commits', []):
            c.execute(
                "INSERT OR REPLACE INTO commits (hash, author, message, time, repo) VALUES (?, ?, ?, ?, ?)",
                (commit['hash'], commit['author'], commit['message'], commit['time'], repo_name)
            )

        # Update workflows
        for workflow in workflow_data.get('workflows', []):
            c.execute(
                "INSERT OR REPLACE INTO workflows (name, url, repo) VALUES (?, ?, ?)",
                (workflow['name'], workflow['url'], repo_name)
            )

        # Update workflow runs
        for run in workflow_data.get('workflow_runs', []):
            # Get required foreign keys
            branch_id = get_branch_id(c, run['branch_name'], repo_name)
            commit_id = get_commit_id(c, run['commit_hash'], repo_name)
            workflow_id = get_workflow_id(c, run['workflow_name'], repo_name)

            if commit_id is None or workflow_id is None:
                print(f"Skipping workflow run - Missing references for commit {run['commit_hash']} or workflow {run['workflow_name']}")
                continue

            c.execute("""
                INSERT OR REPLACE INTO workflowruns 
                (branch, commitid, workflow, author, runtime, createtime, starttime, 
                endtime, queuetime, status, conclusion, url, gitid, 
                archivedbranchname, archivedcommithash, archivedworkflowname, repo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                branch_id, commit_id, workflow_id, run['author'], run['runtime'],
                run['createtime'], run['starttime'], run['endtime'], run['queuetime'],
                run['status'], run['conclusion'], run['url'], run['gitid'],
                run['branch_name'], run['commit_hash'], run['workflow_name'], repo_name
            ))

        conn.commit()

    except Exception as e:
        print(f"Error updating database: {e}")
        conn.rollback()
        raise

    finally:
        conn.close()

def verify_database(db_file):
    """Verify database structure and basic content"""
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    
    # Check tables exist
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in c.fetchall()]
    required_tables = ['repos', 'branches', 'commits', 'workflows', 'workflowruns']
    
    missing_tables = set(required_tables) - set(tables)
    if missing_tables:
        print(f"Missing tables: {missing_tables}")
        return False
    
    # Check basic content
    for table in required_tables:
        c.execute(f"SELECT COUNT(*) FROM {table}")
        count = c.fetchone()[0]
        print(f"Table {table}: {count} rows")
    
    conn.close()
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize and update local workflow database")
    parser.add_argument('-db', '--database', required=True, help="Path to SQLite database file")
    parser.add_argument('-r', '--repo', required=True, help="Repository name (owner/repo)")
    parser.add_argument('-i', '--init', action='store_true', help="Initialize new database")
    parser.add_argument('-d', '--data', help="Path to JSON file containing workflow data")
    parser.add_argument('-v', '--verify', action='store_true', help="Verify database structure")
    
    args = parser.parse_args()
    
    if args.init:
        print(f"Initializing database: {args.database}")
        init_database(args.database)
    
    if args.data:
        print(f"Updating database with data from: {args.data}")
        with open(args.data, 'r') as f:
            workflow_data = json.load(f)
        update_database(args.database, args.repo, workflow_data)
    
    if args.verify:
        print(f"Verifying database: {args.database}")
        verify_database(args.database)
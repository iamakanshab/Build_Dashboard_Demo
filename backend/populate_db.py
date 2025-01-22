# export_db.py
import sqlite3
import json
import argparse

def export_to_json(db_file, repo_name, output_file):
    """Export database content to JSON file"""
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row  # This enables column name access
    c = conn.cursor()
    
    export_data = {
        'branches': [],
        'commits': [],
        'workflows': [],
        'workflow_runs': []
    }
    
    # Export branches
    c.execute("""
        SELECT name, author, repo
        FROM branches
        WHERE repo = ?
    """, (repo_name,))
    export_data['branches'] = [dict(row) for row in c.fetchall()]
    
    # Export commits
    c.execute("""
        SELECT hash, author, message, time, repo
        FROM commits
        WHERE repo = ?
    """, (repo_name,))
    export_data['commits'] = [dict(row) for row in c.fetchall()]
    
    # Export workflows
    c.execute("""
        SELECT name, url, repo
        FROM workflows
        WHERE repo = ?
    """, (repo_name,))
    export_data['workflows'] = [dict(row) for row in c.fetchall()]
    
    # Export workflow runs with resolved foreign keys
    c.execute("""
        SELECT 
            wr.author,
            wr.runtime,
            wr.createtime,
            wr.starttime,
            wr.endtime,
            wr.queuetime,
            wr.status,
            wr.conclusion,
            wr.url,
            wr.gitid,
            b.name as branch_name,
            c.hash as commit_hash,
            w.name as workflow_name,
            wr.repo
        FROM workflowruns wr
        JOIN branches b ON wr.branch = b.id
        JOIN commits c ON wr.commitid = c.id
        JOIN workflows w ON wr.workflow = w.id
        WHERE wr.repo = ?
    """, (repo_name,))
    export_data['workflow_runs'] = [dict(row) for row in c.fetchall()]
    
    # Write to file
    with open(output_file, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"Exported data to {output_file}")
    
    # Print some statistics
    print("\nExport statistics:")
    for key, value in export_data.items():
        print(f"{key}: {len(value)} records")
    
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export database content to JSON")
    parser.add_argument('-db', '--database', required=True, help="SQLite database file")
    parser.add_argument('-r', '--repo', required=True, help="Repository name (owner/repo)")
    parser.add_argument('-o', '--output', required=True, help="Output JSON file")
    
    args = parser.parse_args()
    export_to_json(args.database, args.repo, args.output)
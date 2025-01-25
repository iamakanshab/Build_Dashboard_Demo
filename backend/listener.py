from github import Github
import datetime, time
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
import tqdm
import pickle
import os
import argparse
from sqlauthenticator import connector

class Dashboard:

    def __init__(self, key, repo, password, port=5000):
        self.key = key
        self.repo_path = repo
        self.github = Github(self.key)
        self.repo = self.github.get_repo(self.repo_path)
        self.password = password
        self.app = Flask(__name__)
        self.app.add_url_rule(
            "/webhook", "webhook", self.handle_webhook, methods=["POST"]
        )
        self.port = port

    def start(self):
        self.app.run(host='0.0.0.0', port=self.port, debug=True)

    def stop(self):
        pass

    def handle_webhook(self):
        data = request.get_json()
        # handle new branch creation
        if data.get("ref_type") == "branch":
            try:
                self.add_branch(data)
            except Exception as e:
                print(e)
        # handle new commit
        if "commits" in data:
            try:
                self.add_commit(data)
            except Exception as e:
                print(e)
        # handle new workflow run
        if "workflow_run" in data:
            try:
                self.add_workflow_run(data)
            except Exception as e:
                print(e)
        if "workflow_job" in data and data.get("action") == "in_progress":
            try:
                self.add_initial_queue_time(data)
            except Exception as e:
                print(e)
        return "", 200

    def add_initial_queue_time(self, data):
        start_time = datetime.datetime.fromisoformat(data.get("workflow_job", {}).get("started_at").replace("Z", ""))
        run_id = data.get("workflow_job", {}).get("run_id")
        conn = connector(self.password)
        c = conn.cursor()
        c.execute("USE shark_dashboard_db")
        c.execute(
        """
        UPDATE workflowruns
        SET 
            starttime = %s,
            queuetime = TIMESTAMPDIFF(SECOND, createtime, %s)
        WHERE 
            gitid = %s 
            AND queuetime = 0.0;
        """,
        (start_time, start_time, run_id)
        )
        conn.commit()
        conn.close()


    def add_commit(self, data):
        conn = connector(self.password)
        c = conn.cursor()
        c.execute("USE shark_dashboard_db")
        print("ADDING COMMIT")
        branch_name = data.get("ref").replace("refs/heads/", "")
        pusher = data.get("pusher", {}).get("name")
        for commit in data.get("commits", []):
            commit_hash = commit.get("id")
            try:
                author = data.get("author", {}).get("name")
                commit_time = data.get("author, {}").get("date")
            except:
                print(f"No Author found for {commit_hashj}")
            message = commit.get("message")
            commit_time = time.mktime(commit_time.timetuple())
            c.execute(
                """
                INSERT INTO commits (hash, author, message, time, repo)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    author = VALUES(author),
                    message = VALUES(message),
                    time = VALUES(time),
                    repo = VALUES(repo);
                """,
                (commit_hash, author, message, self.repo_path),
            )
        conn.commit()
        conn.close()

    def add_branch(self, data):
        conn = connector(self.password)
        c = conn.cursor()
        c.execute("USE shark_dashboard_db")
        print("ADDING BRANCH")
        branch_name = data.get("ref")
        author = data.get("sender", {}).get("login")
        c.execute(
            """
            INSERT INTO branches (name, repo)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE repo = VALUES(repo);
            """,
            (branch_name, author, self.repo_path),
        )
        conn.commit()
        conn.close()

    def add_workflow_run(self, data):
        conn = connector(self.password)
        c = conn.cursor()
        c.execute("USE shark_dashboard_db")
        print("ADDING WORKFLOW RUN")
        workflow_run = data.get("workflow_run", {})
        workflow_name = workflow_run.get("name")
        branch_name = workflow_run.get("head_branch")
        commit_hash = workflow_run.get("head_sha")
        author = workflow_run.get("actor", {}).get("login")
        conclusion = workflow_run.get("conclusion")
        status = workflow_run.get("status")
        gitid = workflow_run.get("id")
        run_url = workflow_run.get("html_url")
        jobs = workflow_run.get("jobs", {})
        created_at_dt = datetime.datetime.fromisoformat(
            workflow_run.get("created_at").replace("Z", "")
        )
        updated_at_dt = datetime.datetime.fromisoformat(
            workflow_run.get("updated_at").replace("Z", "")
        )
        started_at_dt = datetime.datetime.fromisoformat(
            workflow_run.get("run_started_at").replace("Z", "")
        )
        try:
            runtime = workflow_run.timing().run_duration_ms / 100
        except:
            runtime = (updated_at_dt - started_at_dt).total_seconds()
        if status == "queued":
            queue_time = (updated_at_dt - created_at_dt).total_seconds()
        else:
            queue_time = (started_at_dt - created_at_dt).total_seconds()
        c.execute(
            """
            INSERT INTO workflowruns 
                (gitid, author, runtime, createtime, starttime, endtime, queuetime, status, conclusion, url, branchname, commithash, workflowname, repo)
            VALUES 
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                author = VALUES(author),
                runtime = VALUES(runtime),
                createtime = VALUES(createtime),
                starttime = VALUES(starttime),
                endtime = VALUES(endtime),
                queuetime = VALUES(queuetime),
                status = VALUES(status),
                conclusion = VALUES(conclusion),
                url = VALUES(url),
                branchname = VALUES(branchname),
                commithash = VALUES(commithash),
                workflowname = VALUES(workflowname),
                repo = VALUES(repo);
            """,
            (
                gitid,
                author,
                runtime,
                created_at_dt,
                started_at_dt,
                updated_at_dt,
                queue_time,
                status,
                conclusion,
                run_url,
                branch_name,
                commit_hash,
                workflow_name,
                self.repo_path
            ),
        )
        conn.commit()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="Backend-Listener",
                                     description="starts the listener to live update the database")
    parser.add_argument('-r', '--repo', help="repository to scrape data from")
    parser.add_argument('-k', "--key", help="repository key")
    parser.add_argument('-p', "--port", help="port to expose", default=5000)
    parser.add_argument('-pwd', '--password', help="Password to remote database")
    args = parser.parse_args()
    dashboard = Dashboard(
        args.key,
        args.repo,
        args.password,
        args.port
    )
    dashboard.start()

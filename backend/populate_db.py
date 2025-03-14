import os
from github import Github
import datetime, time
import argparse
from sqlauthenticator import connector
from tqdm import tqdm

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="Local-Database", description="Initialize Local DataBase"
    )
    parser.add_argument("-r", "--repo", help="repository to scrape data from")
    parser.add_argument("-k", "--key", help="repository key")
    parser.add_argument(
        "-m",
        "--max_runs",
        type=int,
        default=-1,
        help="Maximum workflow runs to scrape",
    )
    parser.add_argument(
        "-t",
        "--last_time",
        type=int,
        default=0,
        help="Only scrape data back to this date",
    )
    parser.add_argument(
        "-pwd", "--password", help="Password to remote database"
    )
    args = parser.parse_args()
    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    # c.execute("PRAGMA foreign_keys = ON;")

    print("POPULATING DATABASE")
    github = Github(args.key)
    repo = github.get_repo(args.repo)

    def get_workflow_run_row(workflow_run, repo):
        branch = workflow_run.head_branch
        commit = workflow_run.head_sha
        workflow_name = workflow_run.name
        url = workflow_run.url
        gitid = workflow_run.id
        author = workflow_run.actor.login
        status = workflow_run.status
        conclusion = workflow_run.conclusion
        jobs = workflow_run.jobs()
        createtime = workflow_run.created_at
        try:
            starttime = jobs[0].started_at
        except:
            starttime = workflow_run.run_started_at
        endtime = workflow_run.updated_at
        if status != "queued":
            queuetime = time.mktime(starttime.timetuple()) - time.mktime(
                createtime.timetuple()
            )
        else:
            queuetime = time.mktime(endtime.timetuple()) - time.mktime(
                createtime.timetuple()
            )
        try:
            runtime = workflow_run.timing().run_duration_ms / 100
        except:
            runtime = time.mktime(endtime.timetuple()) - time.mktime(
                starttime.timetuple()
            )
        return (
            gitid,
            author,
            runtime,
            createtime,
            starttime,
            endtime,
            queuetime,
            status,
            conclusion,
            url,
            branch,
            commit,
            workflow_name,
            repo,
        )

    conn.close()

    print("POPULATING REPO")

    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    c.execute(
        """
    INSERT INTO repos (name)
    VALUES (%s)
    ON DUPLICATE KEY UPDATE name = VALUES(name);
    """,
        (args.repo,),
    )
    conn.commit()
    conn.close()

    print("POPULATING BRANCHES")

    branches = repo.get_branches()
    branch_values = [(branch.name, args.repo) for branch in branches]
    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    for branch_value in branch_values:
        c.execute(
            """
            INSERT INTO branches (name, repo)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE repo = VALUES(repo);

            """,
            branch_value,
        )
    conn.commit()
    conn.close()

    print("POPULATING COMMITS")

    commits = repo.get_commits()
    commit_values = [
        (
            str(commit.sha),
            commit.commit.author.name,
            commit.commit.message,
            commit.commit.author.date,
            args.repo,
            "https://github.com/" + commit.commit.author.name,
        )
        for commit in commits
    ]
    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    print("ADDING COMMITS")
    for i in tqdm(range(len(commit_values)), desc="Adding Commits to DB"):
        commit_value = commit_values[i]
        c.execute(
            """
            INSERT INTO commits (hash, author, message, time, repo, authorurl)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                author = VALUES(author),
                message = VALUES(message),
                time = VALUES(time),
                repo = VALUES(repo),
                authorurl = VALUES(authorurl);
            """,
            commit_value,
        )
    conn.commit()
    conn.close()

    print("POPULATING WORKFLOWS")

    workflows = repo.get_workflows()
    workflow_values = [
        (workflow.name, workflow.url, args.repo) for workflow in workflows
    ]
    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    for i in tqdm(range(len(workflow_values)), desc="Adding Wrokflows to DB"):
        workflow_value = workflow_values[i]
        c.execute(
            """
            INSERT INTO workflows (name, url, repo)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                url = VALUES(url),
                repo = VALUES(repo);
            """,
            workflow_value,
        )
    conn.commit()
    conn.close()

    print("POPULATING WORKFLOW RUNS")

    workflow_runs = repo.get_workflow_runs()
    workflow_run_values = []
    i = 0
    for workflow_run in workflow_runs:
        if i > args.max_runs and args.max_runs != -1:
            break
        workflow_run_input = get_workflow_run_row(workflow_run, args.repo)
        workflow_run_values.append(workflow_run_input)
        i += 1
    conn = connector(args.password)
    c = conn.cursor()
    c.execute("USE shark_dashboard_db")
    print("ADDING WORKFLOW RUNS")
    for i in tqdm(range(len(workflow_run_values)), desc="Adding workflow runs"):
        workflow_run_value = workflow_run_values[i]
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
            workflow_run_value,
        )
    conn.commit()
    conn.close()

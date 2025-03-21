# Dashboard Backend

This code works as a backend to listen for changes to monitered repositories and update the database underlying the dashboard.

# Using the backend

If you are not maintaining the backend, you can access and query the database by using the connector object defined in sqlauthenticator.py
```
from sqlauthenticator import connector
conn = connector(password)
```
from here conn can be used like an sqlite3 connector.  Be sure to close it when you are finished querying if your script runs for a while to avoid locking out the listener you will most likley want to run `cursor.execute("USE shark_dashboard_db") to make sure you are have the database selected"

## Using the database

The database has the folliwing schema

### repos
```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| Id    | int         | NO   | PRI | NULL    | auto_increment |
| name  | varchar(50) | YES  | UNI | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
```

### branches
```
+--------+-------------+------+-----+---------+----------------+
| Field  | Type        | Null | Key | Default | Extra          |
+--------+-------------+------+-----+---------+----------------+
| Id     | int         | NO   | PRI | NULL    | auto_increment |
| name   | varchar(50) | NO   | UNI | NULL    |                |
| author | varchar(50) | YES  |     | NULL    |                |
| repo   | varchar(50) | NO   |     | NULL    |                |
+--------+-------------+------+-----+---------+----------------+
```

### commits
```
+-----------+--------------+------+-----+---------+----------------+
| Field     | Type         | Null | Key | Default | Extra          |
+-----------+--------------+------+-----+---------+----------------+
| Id        | int          | NO   | PRI | NULL    | auto_increment |
| hash      | varchar(100) | NO   | UNI | NULL    |                |
| author    | varchar(50)  | YES  |     | NULL    |                |
| message   | text         | YES  |     | NULL    |                |
| time      | datetime     | YES  |     | NULL    |                |
| repo      | varchar(50)  | NO   |     | NULL    |                |
| forced    | boolean      | YES  |     | NULL    |                |
| authorurl | varchar(100) | YES  |     | NULL    |                |
+-----------+--------------+------+-----+---------+----------------+
```

### workflows
```
+-------+--------------+------+-----+---------+----------------+
| Field | Type         | Null | Key | Default | Extra          |
+-------+--------------+------+-----+---------+----------------+
| Id    | int          | NO   | PRI | NULL    | auto_increment |
| name  | varchar(50)  | NO   | UNI | NULL    |                |
| url   | varchar(100) | NO   |     | NULL    |                |
| repo  | varchar(50)  | NO   |     | NULL    |                |
+-------+--------------+------+-----+---------+----------------+
```

### workflowruns
```
+--------------+--------------+------+-----+---------+----------------+
| Field        | Type         | Null | Key | Default | Extra          |
+--------------+--------------+------+-----+---------+----------------+
| Id           | int          | NO   | PRI | NULL    | auto_increment |
| gitid        | bigint       | NO   | UNI | NULL    |                |
| author       | varchar(50)  | YES  |     | NULL    |                |
| runtime      | float        | YES  |     | NULL    |                |
| createtime   | datetime     | YES  |     | NULL    |                |
| starttime    | datetime     | YES  |     | NULL    |                |
| endtime      | datetime     | YES  |     | NULL    |                |
| queuetime    | bigint       | YES  |     | 0       |                |
| status       | varchar(50)  | YES  |     | NULL    |                |
| conclusion   | varchar(50)  | YES  |     | NULL    |                |
| url          | varchar(100) | YES  |     | NULL    |                |
| branchname   | varchar(100) | YES  |     | NULL    |                |
| commithash   | varchar(100) | YES  |     | NULL    |                |
| workflowname | varchar(50)  | YES  |     | NULL    |                |
| repo         | varchar(50)  | NO   |     | NULL    |                |
| os           | varchar(100) | YES  |     | NULL    |                |
+--------------+--------------+------+-----+---------+----------------+
```

# Initializing the backend 

to initialize the backend database, run the `populate_db.py` script with the following arguments:


`-r`: the repo you want to pull from, should be in the format `'iree-org/iree'`

`-k`: the key that gives permissions to pull data from that repository 

`-m`: the max number of workflows to scrape. You might want to set this for larger repositories

`-pwd`: The password to the Azure Database

The full command should look like this
```
python populate_db.py -r "iree-org/iree" -k "your key here" -m 1000 -pwd password
```

##Step 2: Listener

To run the listener, you need the same arguments as above, except there is an optional `-p` port argument. if no port is given, it will use `5000`. There is also no optional `-m` flag

Make sure that that port is exposed, and that the url it is exposed on is in a webhook in the repository you are monitering, otherwise it will not recieve live updates

The full command should look like this:
```
python listener.py -r "iree-org/iree" -k "ghp_putyourkeyhere" -p 5000 -pwd password
```


# Maintenance

If the Listener ever goes down, you can just reuse the same command you used to start it to restart it.

If it has been down for a while, you can use the `populate_db.py` script without the `-i` flag and a low `-m` flag

The listeners can run concurrently.  Webhooks are set up on the following ports

iree-org/iree: 5000  
iree-org/iree-turbine: 5001  
iree-org/iree-test-suites: 5002  
nod-ai/shark-ai: 5003  
nod-ai/SHARK-TestSuite: 5004  

these can be brought back online with

```
python listener.py -r "iree-org/iree" -k "your-personal-access-token-here" -p 5000 -pwd "your-password-here"

python listener.py -r "iree-org/iree-turbine" -k "your-personal-access-token-here" -p 5001 -pwd "your-password-here"

python listener.py -r "iree-org/iree-test-suite" -k "your-personal-access-token-here" -p 5002 -pwd "your-password-here"

python listener.py -r "nod-ai/shark-ai" -k "your-personal-access-token-here" -p 5003 -pwd "your-password-here"

python listener.py -r "nod-ai/SHARK-TestSuite" -k "your-personal-access-token-here" -p 5004 -pwd "your-password-here"
```
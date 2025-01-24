import mysql.connector

def connector(pwd):
    db_config = {
            'host': 'shark-dashboard-db.c3kwuosg6kjs.us-east-2.rds.amazonaws.com',
            'user': 'admin',
            'password': pwd,
            'database': 'shark_dashboard_db',
            'port': 3306
            }
    connection = mysql.connector.connect(**db_config)

    return connection
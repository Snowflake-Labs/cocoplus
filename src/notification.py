import streamlit as st
from snowflake.snowpark import Session
from datetime import datetime, timedelta

def create_notification_table(session: Session):
    """
    Creates a notification table in Snowflake if it doesn't exist.
    
    Args:
        session (Session): Active Snowflake session object
        
    Raises:
        Exception: If table creation fails
    """
    try:
        session.sql("""
            CREATE TABLE IF NOT EXISTS notification (
                id INTEGER IDENTITY PRIMARY KEY,
                operation_type STRING,
                status STRING,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                details STRING
            )
        """).collect()
    except Exception as e:
        st.error(f"Failed to create notification table: {e}")
        print(f"Error creating notification table: {e}")
        raise Exception(f"Failed to create notification table: {e}")

def create_logs_table(session: Session):
    """
    Creates a logs table in Snowflake if it doesn't exist.
    
    Args:
        session (Session): Active Snowflake session object
    """
    session.sql("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER IDENTITY PRIMARY KEY,
            operation_type STRING,
            error_message STRING,
            created_at TIMESTAMP
        )
    """).collect()

def add_notification_entry(session: Session, operation_type: str, status: str, details: str) -> int:
    """
    Adds a new notification entry to the notification table.
    
    Args:
        session (Session): Active Snowflake session object
        operation_type (str): Type of operation being performed
        status (str): Current status of the operation
        details (str): Additional details about the operation
        
    Returns:
        int: ID of the newly created notification entry
        
    Raises:
        Exception: If notification ID retrieval fails
    """
    if not operation_type:
        operation_type = "Unknown Operation"
    if not status:
        status = "In-Progress"
    if not details:
        details = "No details provided"

    create_notification_table(session)
    # Insert the notification entry
    insert_query = f"""
        INSERT INTO notification (operation_type, status, created_at, details)
        VALUES ('{operation_type}', '{status}', CURRENT_TIMESTAMP, '{details}')
    """
    session.sql(insert_query).collect()

    # Fetch the last inserted notification ID based on created_at
    id_query = """
        SELECT id FROM notification
        WHERE created_at = (
            SELECT MAX(created_at) FROM notification
        )
    """
    
    result = session.sql(id_query).collect()

    # Return the notification ID
    if result:
        notification_id = result[0]["ID"]
        print(f"Inserted notification ID: {notification_id}")
        return notification_id
    else:
        raise Exception("Failed to retrieve notification ID")

def update_notification_entry(session: Session, notification_id: int, status: str):
    """
    Updates the status and completion time of an existing notification entry.
    
    Args:
        session (Session): Active Snowflake session object
        notification_id (int): ID of the notification to update
        status (str): New status to set for the notification
    """
    if not status:
        status = 'Unknown Status'

    query = f"""
        UPDATE notification
        SET status = '{status}', completed_at = CURRENT_TIMESTAMP
        WHERE id = {notification_id}
    """
    session.sql(query).collect()

def update_notification_fine_tune_entry(session: Session, notification_id: int, details: str):
    """
    Updates the status and completion time of an existing notification entry.
    
    Args:
        session (Session): Active Snowflake session object
        notification_id (int): ID of the notification to update
        status (str): New status to set for the notification
    """
    if not details:
        status = 'Unknown details'

    query = f"""
        UPDATE notification
        SET details = '{details}', completed_at = CURRENT_TIMESTAMP
        WHERE id = {notification_id}
    """
    session.sql(query).collect()

def escape_sql_string(value: str) -> str:
    """
    Escapes single quotes in SQL strings to prevent SQL injection.
    
    Args:
        value (str): String to escape
        
    Returns:
        str: Escaped string with single quotes doubled
    """
    return value.replace("'", "''") if value else value

def add_log_entry(session: Session, operation_type: str, error_message: str):
    """
    Adds a new error log entry to the logs table.
    
    Args:
        session (Session): Active Snowflake session object
        operation_type (str): Type of operation that generated the error
        error_message (str): Description of the error that occurred
    """
    if not operation_type:
        operation_type = "Unknown Operation"
    if not error_message:
        error_message = "No error message provided"

    # Escape special characters to prevent SQL issues
    operation_type_escaped = escape_sql_string(operation_type)
    error_message_escaped = escape_sql_string(error_message)
    create_logs_table(session)
    # Construct the SQL query with escaped values
    query = f"""
        INSERT INTO logs (operation_type, error_message, created_at)
        VALUES ('{operation_type_escaped}', '{error_message_escaped}', CURRENT_TIMESTAMP)
    """
    
    # Execute the query
    session.sql(query).collect()

def fetch_notifications(session: Session, start_date=None, end_date=None):
    """
    Retrieves notification entries filtered by date range.
    
    Args:
        session (Session): Active Snowflake session object
        start_date (datetime, optional): Start date for filtering notifications
        end_date (datetime, optional): End date for filtering notifications
        
    Returns:
        pandas.DataFrame: DataFrame containing filtered notification entries
    """
    create_notification_table(session)
    if start_date and end_date:
        # Format the dates properly for Snowflake SQL
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        
        query = f"""
            SELECT * FROM notification
            WHERE created_at BETWEEN '{start_date_str}' AND '{end_date_str}'
            ORDER BY created_at DESC
        """
    else:
        query = "SELECT * FROM notification ORDER BY created_at DESC"
    
    return session.sql(query).to_pandas()

def fetch_logs(session: Session, start_date=None, end_date=None):
    """
    Retrieves log entries filtered by date range.
    
    Args:
        session (Session): Active Snowflake session object
        start_date (datetime, optional): Start date for filtering logs
        end_date (datetime, optional): End date for filtering logs
        
    Returns:
        pandas.DataFrame: DataFrame containing filtered log entries
    """
    create_logs_table(session)
    if start_date and end_date:
        # Format the dates properly for Snowflake SQL
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        
        query = f"""
            SELECT * FROM logs
            WHERE created_at BETWEEN '{start_date_str}' AND '{end_date_str}'
            ORDER BY created_at DESC
        """
    else:
        query = "SELECT * FROM logs ORDER BY created_at DESC"
    
    return session.sql(query).to_pandas()

def display_notification(session: Session):
    """
    Displays a Streamlit interface for viewing notifications and logs.
    
    Creates an interactive UI with:
    - Toggle between notifications and logs view
    - Date range filtering
    - Refresh button
    - Data display in tabular format
    
    Args:
        session (Session): Active Snowflake session object
    """
    # Show Logs checkbox at the top, and dynamically change title
    show_logs = st.checkbox("Show Logs", key="log_checkbox")

    # Title with refresh button next to it
    col1, col2 = st.columns([9, 1])

    with col1:
        if show_logs:
            st.title("Logs")
        else:
            st.title("Status")

    with col2:
        if st.button("↻", help="Refresh data"):  # Refresh button with custom look
            pass  # Trigger a re-run for refreshing

    # Create notification and logs tables if they don't exist
    create_notification_table(session)

    # Default to showing last day's data
    today = datetime.today() + timedelta(days=1)
    last_day = today - timedelta(days=7)


    col1, col2 = st.columns([2, 2])

    # Date filter
    with col1:
        start_date = st.date_input("Start Date", last_day)
        
    with col2:
        end_date = st.date_input("End Date", today)

    # Fetch either notifications or logs based on toggle
    if show_logs:
        logs = fetch_logs(session, start_date, end_date)
        if logs.empty:
            st.write("No logs available.")
        else:
            st.dataframe(logs)
    else:
        notifications = fetch_notifications(session, start_date, end_date)
        print(notifications)
        if notifications.empty:
            st.write("No Status Available.")
        else:
            st.dataframe(notifications)

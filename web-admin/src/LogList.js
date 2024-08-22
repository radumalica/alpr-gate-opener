import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';

function formatDate(date) {
  const dateTimeObject = DateTime.fromISO(date)
  return `${dateTimeObject.toFormat('dd')}-${dateTimeObject.toFormat('MM')}-${dateTimeObject.toFormat('yyyy')} ${dateTimeObject.toFormat('HH')}:${dateTimeObject.toFormat('mm')}:${dateTimeObject.toFormat('ss')}`;
}

const LogList = () => {
  const [logs, setLogs] = useState([]);
  

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/admin/logs');
      console.log('Logs:', response.data); // Add this line to inspect the data
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const deleteLog = async (log) => {
    try {
      await axios.delete(`/admin/delete_log/${log}`);
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  return (
    <div>
      <h3>Logs</h3>
      <ul>
        {logs.map((log,index) => (
          <li align="left" key={index}>
           <b>{log._id} -{log.plate} - {log.status} at {formatDate(log.datetime)}</b> &nbsp;
            <button onClick={() => deleteLog(log._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LogList;

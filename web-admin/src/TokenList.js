import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';

function formatDate(date) {
  const dateTimeObject = DateTime.fromISO(date)
  return `${dateTimeObject.toFormat('dd')}-${dateTimeObject.toFormat('MM')}-${dateTimeObject.toFormat('yyyy')} ${dateTimeObject.toFormat('HH')}:${dateTimeObject.toFormat('mm')}:${dateTimeObject.toFormat('ss')}`;
}

const TokenList = () => {
  const [tokens, setTokens] = useState([]);
  const [newToken, setNewToken] = useState(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await axios.get('/admin/get_tokens');
      console.log('Tokens:', response.data); // Add this line to inspect the data
      setTokens(response.data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const createToken = async () => {
    try {
      const response = await axios.post('/admin/create_token', { password: 'admin' });
      setNewToken(response.data.token);
      fetchTokens();
    } catch (error) {
      console.error('Error creating token:', error);
    }
  };

  const deleteToken = async (token) => {
    try {
      await axios.delete(`/admin/delete_token/${token}`);
      fetchTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  };

  return (
    <div>
      <h3>Tokens</h3>
      <button onClick={createToken}>Create Token</button>
      {newToken && <p>New Token: {newToken}</p>}
      <ul>
        {tokens.map((token) => (
          <li align="left" key={token._id}>
           {token.token ? token.token : "No Data"} &nbsp;
            <button onClick={() => deleteToken(token._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TokenList;

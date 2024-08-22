import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlateList = () => {
  const [plates, setPlates] = useState([]);

  useEffect(() => {
    fetchPlates();
  }, []);

  const fetchPlates = async () => {
    try {
      const response = await axios.get('/admin/get_plates');
      setPlates(response.data);
    } catch (error) {
      console.error('Error fetching plates:', error);
    }
  };

  const togglePlate = async (plate) => {
    try {
      await axios.post('/admin/toggle_plate', { plate });
      fetchPlates();
    } catch (error) {
      console.error('Error toggling plate:', error);
    }
  };

  const removePlate = async (plate) => {
    try {
      await axios.delete(`/admin/remove_plate/${plate}`);
      fetchPlates();
    } catch (error) {
      console.error('Error removing plate:', error);
    }
  };

  return (
    <div>
      <h3>Plates</h3>
      <ul align="left">
        {plates.map((plate) => (
          <li key={plate._id}>
            {plate.plate} - {plate.enabled ? 'Enabled' : 'Disabled'} &nbsp;
            <button onClick={() => togglePlate(plate.plate)}>Toggle</button>
            <button onClick={() => removePlate(plate._id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlateList;

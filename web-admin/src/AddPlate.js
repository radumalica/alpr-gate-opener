import React, { useState } from 'react';
import axios from 'axios';

const AddPlate = ({ onPlateAdded }) => {
  const [plate, setPlate] = useState('');

  const addPlate = async () => {
    if (!plate) return;
    try {
      await axios.post('/admin/add_plate', { plate });
      setPlate('');
      onPlateAdded();
    } catch (error) {
      console.error('Error adding plate:', error);
    }
  };

  return (
    <div>
      <h3>Add Plate</h3>
      <input
        type="text"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        placeholder="Enter plate number"
      />
      <button onClick={addPlate}>Add Plate</button>
    </div>
  );
};

export default AddPlate;

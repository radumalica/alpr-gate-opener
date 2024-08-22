import logo from './logo.svg';
import './App.css';
import AddPlate from './AddPlate';
import PlateList from './PlateList';
import TokenList from './TokenList';
import LogList from './LogList';

function App() {
  return (
    <div className="App">
      <h1>Plate Management System</h1>
      <AddPlate onPlateAdded={() => { window.location.reload(); }} />
      <PlateList />
      <TokenList />
      <LogList />
    </div>
  );
}

export default App;

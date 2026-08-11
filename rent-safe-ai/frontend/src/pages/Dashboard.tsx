import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">Rent Safe AI Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold">Properties</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold">Safety Score</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">N/A</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold">Alerts</h3>
            <p className="mt-2 text-3xl font-bold text-red-600">0</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

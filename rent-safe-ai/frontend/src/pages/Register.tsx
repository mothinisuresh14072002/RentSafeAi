import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TENANT');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password, role });
      navigate('/login');
    } catch (error) {
      console.error("Registration failed", error);
      alert("Registration failed.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center">Create an Account</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 mt-1 border rounded-md" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 mt-1 border rounded-md" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select className="w-full px-3 py-2 mt-1 border rounded-md" value={role} onChange={e => setRole(e.target.value)}>
              <option value="TENANT">Tenant</option>
              <option value="LANDLORD">Landlord</option>
            </select>
          </div>
          <button type="submit" className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">
            Register
          </button>
        </form>
        <p className="text-sm text-center">
          Already have an account? <Link to="/login" className="text-blue-600">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

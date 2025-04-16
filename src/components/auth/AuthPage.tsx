import { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
          Chat App
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLogin ? (
            <Login onToggleForm={() => setIsLogin(false)} />
          ) : (
            <Register onToggleForm={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
}; 
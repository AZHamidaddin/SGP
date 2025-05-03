import React, { useEffect, useState } from "react";

const SuperAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/users")
      .then(res => res.json())
      .then(data => {
        setUsers(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching users:", err);
        setLoading(false);
      });
  }, []);

  const toggleAdmin = async (userId, currentStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !currentStatus })
      });

      if (!res.ok) throw new Error("Failed to update user");

      setUsers(prev =>
        prev.map(user =>
          user._id === userId ? { ...user, isAdmin: !currentStatus } : user
        )
      );
    } catch (err) {
      console.error("Failed to update admin status:", err);
    }
  };

  return (
    <div className="p-10 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-pink-500">👑 Super Admin Panel</h1>

      {loading ? (
        <p className="text-center text-gray-400">Loading users...</p>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          {users.map(user => (
            <div
              key={user._id}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-800 shadow"
            >
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={user.isAdmin}
                  onChange={() => toggleAdmin(user._id, user.isAdmin)}
                />
                <div className={`w-11 h-6 bg-gray-600 rounded-full shadow-inner transition duration-300 ease-in-out ${user.isAdmin ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <div className={`dot absolute w-5 h-5 bg-white rounded-full shadow transform transition-transform ${user.isAdmin ? 'translate-x-5' : 'translate-x-1'}`}></div>
                </div>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

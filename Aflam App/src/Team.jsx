import React from "react";
import { Link } from "react-router-dom";

const Team = () => {
  const teamMembers = [
    {
      name: "Wael Habib Alkiyani",
      role: "Project Manager",
      image:
        "https://media.licdn.com/dms/image/v2/D5603AQE9QcHNjTmmDA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1715356562792?e=1737590400&v=beta&t=FOaNPgR9Wr2SrEP18gM6IvGEz_mlnJmjJBoVFHYgPig",
      linkedin: "https://www.linkedin.com/in/waelalkiyani/",
      achievements: [
        "Talent Acquisition - Volunteer Team Leader",
        "Full Stack Software Developer",
        "Host - F1 Premium Hospitality",
      ],
    },
    {
      name: "Ali Hamidaddin",
      role: "Data Engineer",
      image:
        "https://media.licdn.com/dms/image/v2/D4D03AQHcjDBtZvz_tA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1684000509822?e=1737590400&v=beta&t=JNHeO0SaJdzFKaiBvMRAwtvVNTwtEP_zPXKDGJFR8pA",
      linkedin: "https://www.linkedin.com/in/ali-h-8aa76a13b/",
      achievements: ["SOC Analyst", "SOC Intern", "Soft Services Intern"],
    },
    {
      name: "Ahmed Alagari",
      role: "Testing Specialist",
      image:
       "https://media.licdn.com/dms/image/v2/D5603AQFq8DUQar-OXA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1731431605150?e=1737590400&v=beta&t=EOg6va0-OXhD_EGauArPJ3-Q88HqLSsr-D3UljkyN8I",
      linkedin: "https://www.linkedin.com/in/ahmed-alagbari-200b13324/",
      achievements: [
        "3rd place @ National Court of Audit",
        "IT Support Technician",
      ],
    },
  ];

  return (
    <div className="bg-gray-900 lg:h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-6xl text-center">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white">Meet Our Team</h1>
          <p className="text-gray-400 mt-4">
            We bring together talented individuals with a passion for innovation,
            creativity, and excellence. Learn more about the leaders driving our
            success.
          </p>
        </div>

        {/* Team Members Section */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center text-center"
            >
              <img
                src={member.image}
                alt={member.name}
                className="w-32 h-32 rounded-full mb-4 border-4 border-gray-300"
              />
              <h2 className="text-xl font-semibold text-gray-800">
                {member.name}
              </h2>
              <p className="text-gray-600">{member.role}</p>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-blue-500 hover:underline"
              >
                LinkedIn Profile
              </a>
              <ul className="text-left mt-4 text-gray-600">
                {member.achievements.map((achievement, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Back to Home Button */}
        <div className="mt-12">
          <Link
            to="/"
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-full shadow-md transition duration-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Team;

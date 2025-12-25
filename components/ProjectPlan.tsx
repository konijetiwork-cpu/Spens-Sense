
import React from 'react';

const ProjectPlan: React.FC = () => {
  const phases = [
    {
      title: "Phase 1: Foundation & Identity",
      tasks: [
        "Email-based authentication (Supabase or Firebase Auth).",
        "Base Responsive UI layout with Tailwind.",
        "Secure user data storage initialization."
      ]
    },
    {
      title: "Phase 2: The Core Ledger Engine",
      tasks: [
        "Implementation of hierarchical Ledger Groups & Subgroups.",
        "Statement structure builder (DR/CR logic).",
        "Transaction schema definition for Payments vs Receipts."
      ]
    },
    {
      title: "Phase 3: Intelligence (AI Layer)",
      tasks: [
        "Integration with Gemini API for SMS string parsing.",
        "Smart categorizer (Auto-mapping merchants to Subgroups).",
        "Simulated 'Message Listener' workflow for browsers."
      ]
    },
    {
      title: "Phase 4: Interaction & Reporting",
      tasks: [
        "Real-time 'Purpose Pop-ups' for new transactions.",
        "Visual analytics with D3/Recharts for spending trends.",
        "Export functionality for Financial Statements (PDF/CSV)."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-900">Spend Sense Roadmap</h1>
        <p className="text-slate-500 mt-2">Single Page Project Execution Plan</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {phases.map((phase, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-indigo-600 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-sm">
                {idx + 1}
              </span>
              {phase.title}
            </h2>
            <ul className="space-y-3">
              {phase.tasks.map((task, tIdx) => (
                <li key={tIdx} className="flex items-start text-slate-600">
                  <span className="text-indigo-400 mr-2 mt-1">✓</span>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-indigo-900 text-white p-8 rounded-3xl">
        <h3 className="text-xl font-bold mb-4">Anti-Gravity Dev Note</h3>
        <p className="opacity-80">
          Since you are building with no experience, this plan follows an "Iterative Success" model. 
          Focus on Phase 1 first. The Gemini AI implementation handles the "thinking" work of 
          categorization which usually requires complex manual coding.
        </p>
      </div>
    </div>
  );
};

export default ProjectPlan;

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-brand-blue-light dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-5">
        <Wrench size={28} className="text-brand-blue" />
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Coming Soon</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-6">
        This page is under construction. Check back soon for updates.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue-dark transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Home
      </button>
    </div>
  );
}

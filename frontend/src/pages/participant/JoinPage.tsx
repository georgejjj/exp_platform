import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinExperiment } from '../../api';
import { useAuth } from '../../context/AuthContext';
import AlertBanner from '../../components/shared/AlertBanner';

export default function JoinPage() {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('请输入实验代码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await joinExperiment(code.trim(), nickname.trim() || undefined);
      login(data.token, data.participant_id, data.experiment_id, data.group, data.current_step);
      navigate('/demographics');
    } catch (err: any) {
      setError(err.response?.data?.detail || '加入实验失败，请检查实验代码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - branding */}
      <div className="lg:w-2/5 bg-ink-900 flex flex-col items-center justify-center px-8 py-12 lg:py-0">
        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white mb-3">财智方舟</h1>
        <div className="w-16 h-0.5 bg-amber-500 mb-4" />
        <p className="text-ink-400 text-center text-sm lg:text-base">
          行为金融实验平台
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 bg-paper flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-up">
          {error && (
            <div className="mb-4">
              <AlertBanner type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">实验代码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入实验代码"
                className="w-full px-4 py-3 border border-ink-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                昵称 <span className="text-ink-400 font-normal">(选填)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己取个名字吧"
                className="w-full px-4 py-3 border border-ink-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full btn-primary text-base"
            >
              {loading ? '加入中...' : '加入实验'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getExperiments,
  createExperiment,
  updateExperiment,
  getExperimentStats,
  getParticipants,
  exportData,
} from '../../api';
import type { ExperimentOut, ExperimentStats, ParticipantSummary } from '../../types';
import { STEP_LABELS, GROUP_LABELS } from '../../utils/format';
import AlertBanner from '../../components/shared/AlertBanner';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<ExperimentOut[]>([]);
  const [selectedExp, setSelectedExp] = useState<ExperimentOut | null>(null);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadExperiments();
  }, [navigate]);

  const loadExperiments = async () => {
    try {
      const { data } = await getExperiments();
      setExperiments(data);
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newCode) return;
    try {
      await createExperiment({ name: newName, code: newCode });
      setShowCreate(false);
      setNewName('');
      setNewCode('');
      loadExperiments();
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败');
    }
  };

  const handleSelectExp = async (exp: ExperimentOut) => {
    setSelectedExp(exp);
    try {
      const [statsRes, partRes] = await Promise.all([
        getExperimentStats(exp.id),
        getParticipants(exp.id),
      ]);
      setStats(statsRes.data);
      setParticipants(partRes.data);
    } catch {
      // ignore
    }
  };

  const handleToggleStatus = async (exp: ExperimentOut) => {
    const newStatus = exp.status === 'active' ? 'draft' : 'active';
    try {
      await updateExperiment(exp.id, { status: newStatus });
      loadExperiments();
      if (selectedExp?.id === exp.id) {
        setSelectedExp({ ...exp, status: newStatus });
      }
    } catch {
      setError('更新失败');
    }
  };

  const handleExport = async (type: string) => {
    if (!selectedExp) return;
    try {
      const response = await exportData(selectedExp.id, type);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${selectedExp.code}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('导出失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top nav */}
      <div className="bg-ink-900 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-serif font-bold text-white">
          财智方舟 <span className="text-ink-400 font-sans font-normal text-sm ml-2">管理后台</span>
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-ink-400 hover:text-white transition-colors"
        >
          退出
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4">
            <AlertBanner type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Experiment List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif font-bold text-lg text-ink-900">实验列表</h2>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                新建
              </button>
            </div>

            {showCreate && (
              <div className="card p-4 mb-4">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="实验名称"
                  className="w-full px-3 py-2 border border-ink-200 rounded-lg mb-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="实验代码"
                  className="w-full px-3 py-2 border border-ink-200 rounded-lg mb-2 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
                <button
                  onClick={handleCreate}
                  className="w-full btn-primary text-sm py-2"
                >
                  创建
                </button>
              </div>
            )}

            <div className="space-y-2">
              {experiments.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => handleSelectExp(exp)}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${
                    selectedExp?.id === exp.id
                      ? 'border-amber-500 border-l-4 border-l-amber-500'
                      : 'hover:border-ink-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-ink-800">{exp.name}</div>
                      <div className="text-sm font-mono text-ink-400">代码: {exp.code}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        exp.status === 'active'
                          ? 'bg-green-50 text-success border-green-200'
                          : 'bg-ink-50 text-ink-400 border-ink-200'
                      }`}
                    >
                      {exp.status === 'active' ? '进行中' : '草稿'}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 mt-1 font-mono">
                    参与者: {exp.participant_count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Experiment Detail */}
          <div className="lg:col-span-2">
            {selectedExp ? (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-ink-900">{selectedExp.name}</h2>
                      <p className="text-sm font-mono text-ink-400">代码: {selectedExp.code}</p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(selectedExp)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedExp.status === 'active'
                          ? 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                          : 'bg-success text-white hover:bg-green-700'
                      }`}
                    >
                      {selectedExp.status === 'active' ? '暂停' : '激活'}
                    </button>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="card p-3 text-center">
                        <div className="text-2xl font-mono font-bold text-ink-900">{stats.total_participants}</div>
                        <div className="text-xs text-ink-400">总参与者</div>
                      </div>
                      <div className="card p-3 text-center">
                        <div className="text-2xl font-mono font-bold text-success">{stats.completed}</div>
                        <div className="text-xs text-ink-400">已完成</div>
                      </div>
                      <div className="card p-3 text-center">
                        <div className="text-2xl font-mono font-bold text-amber-500">{stats.in_progress}</div>
                        <div className="text-xs text-ink-400">进行中</div>
                      </div>
                    </div>
                  )}

                  {stats && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-ink-400 mb-2">分组分布</h4>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(stats.group_distribution).map(([g, count]) => (
                          <span
                            key={g}
                            className="px-2 py-1 bg-ink-50 border border-ink-200 rounded text-xs font-mono text-ink-700"
                          >
                            {GROUP_LABELS[g] || g}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div className="flex gap-2">
                    {['trades', 'questionnaires', 'events'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleExport(type)}
                        className="px-3 py-1.5 border border-ink-200 text-ink-700 rounded-lg text-sm hover:bg-amber-100/50 hover:border-amber-300 hover:text-amber-700 transition-colors"
                      >
                        导出{type === 'trades' ? '交易' : type === 'questionnaires' ? '问卷' : '事件'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Participants */}
                <div className="card p-6">
                  <h3 className="font-serif font-bold text-ink-900 mb-4">参与者列表</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ink-400 border-b border-ink-200">
                          <th className="pb-2 font-serif font-medium">昵称</th>
                          <th className="pb-2 font-serif font-medium">分组</th>
                          <th className="pb-2 font-serif font-medium">进度</th>
                          <th className="pb-2 font-serif font-medium">偏差等级</th>
                          <th className="pb-2 font-serif font-medium">加入时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p, i) => (
                          <tr
                            key={p.id}
                            className={`border-b border-ink-100 last:border-0 ${
                              i % 2 === 0 ? 'bg-paper' : 'bg-ink-50'
                            }`}
                          >
                            <td className="py-2.5 text-ink-800">{p.nickname || '-'}</td>
                            <td className="text-ink-700">{GROUP_LABELS[p.group || ''] || p.group || '-'}</td>
                            <td>
                              <span className="px-2 py-0.5 bg-amber-100/50 border border-amber-200 rounded text-xs text-amber-700">
                                {STEP_LABELS[p.current_step] || p.current_step}
                              </span>
                            </td>
                            <td className="text-ink-700">{p.bias_level || '-'}</td>
                            <td className="text-ink-400 font-mono text-xs">
                              {new Date(p.created_at).toLocaleString('zh-CN')}
                            </td>
                          </tr>
                        ))}
                        {participants.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-ink-400">
                              暂无参与者
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center text-ink-400">
                请从左侧选择一个实验
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

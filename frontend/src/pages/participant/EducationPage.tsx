import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEducationContent } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useEventLogger } from '../../hooks/useEventLogger';
import type { EducationContent } from '../../types';

export default function EducationPage() {
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { log } = useEventLogger();
  const [content, setContent] = useState<EducationContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getEducationContent();
        setContent(data);
        log('education_view', 'education', { title: data.title, bias_level: data.bias_level });
      } catch {
        // continue anyway
      } finally {
        setLoading(false);
      }
    })();
  }, [log]);

  const handleContinue = () => {
    setStep('phase2_trading');
    navigate('/trading/2');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">加载学习内容...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <button onClick={handleContinue} className="btn-primary">
          继续
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-6">
      <div className="max-w-2xl mx-auto animate-fade-up">
        <h1 className="text-2xl font-serif font-bold text-center text-ink-900 mb-8">{content.title}</h1>

        {content.sections.map((section, i) => (
          <div key={i} className="card p-6 mb-4">
            <h3 className="font-serif font-bold text-ink-900 mb-3">{section.heading}</h3>
            <p className="text-ink-700 text-sm leading-7 whitespace-pre-line">
              {section.body}
            </p>
          </div>
        ))}

        {content.key_takeaways.length > 0 && (
          <div className="card border-l-4 border-l-amber-500 p-6 mb-4 bg-amber-100/30">
            <h3 className="font-serif font-bold text-ink-900 mb-3">核心要点</h3>
            <ul className="space-y-2">
              {content.key_takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.examples.length > 0 && (
          <div className="card p-6 mb-4">
            <h3 className="font-serif font-bold text-ink-900 mb-3">实例分析</h3>
            {content.examples.map((ex, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <div className="bg-ink-100 border border-ink-200 rounded-lg p-3 mb-2">
                  <div className="text-xs text-ink-400 mb-1">情境</div>
                  <p className="text-sm text-ink-800">{ex.scenario}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs text-success mb-1">正确思路</div>
                  <p className="text-sm text-green-800">{ex.correct_thinking}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card border-l-4 border-l-error p-5 mb-6">
          <p className="text-sm text-ink-700 leading-relaxed">
            接下来您将进入第二轮交易。请运用刚才学到的知识，尽量做出理性的投资决策！
          </p>
        </div>

        <button
          onClick={handleContinue}
          className="w-full btn-primary text-base"
        >
          开始第二轮交易
        </button>
      </div>
    </div>
  );
}

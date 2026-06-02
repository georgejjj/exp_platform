import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuestionnaire, submitAnswer, completeQuestionnaire } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { useEventLogger } from '../../hooks/useEventLogger';
import type { QuestionItem, AnswerResponse } from '../../types';
import ProgressBar from '../../components/shared/ProgressBar';
import RadioOptionCard from '../../components/shared/RadioOptionCard';
import AlertBanner from '../../components/shared/AlertBanner';

export default function QuestionnairePage() {
  const { phase } = useParams<{ phase: string }>();
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { setPreTestResult, setPostTestResult } = useExperiment();
  const { log } = useEventLogger();

  const [questionnaireId, setQuestionnaireId] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!phase) return;
    (async () => {
      try {
        const { data } = await getQuestionnaire(phase);
        setQuestionnaireId(data.questionnaire_id);
        setQuestions(data.questions);
        log('questionnaire_start', `questionnaire_${phase}`);
      } catch {
        // no questionnaire found
      } finally {
        setLoading(false);
      }
    })();
  }, [phase, log]);

  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const handleSelect = async (key: string) => {
    if (feedback) return; // already answered
    setSelected(key);
    setSubmitting(true);
    const elapsed = Date.now() - startTime.current;

    try {
      const { data } = await submitAnswer(phase!, questionnaireId, currentQ.id, key, elapsed);
      setFeedback(data);
      log('questionnaire_answer', `questionnaire_${phase}`, {
        question_id: currentQ.id,
        selected: key,
        is_correct: data.is_correct,
        time_ms: elapsed,
      });
    } catch {
      // allow retry
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setFeedback(null);
      startTime.current = Date.now();
      return;
    }

    // Complete questionnaire
    setSubmitting(true);
    try {
      const { data } = await completeQuestionnaire(phase!, questionnaireId);
      if (phase === 'pre_test') {
        setPreTestResult(data);
        setStep('race_car_game');
        navigate('/race-car-game');
      } else {
        setPostTestResult(data);
        setStep('analysis');
        navigate('/analysis');
      }
    } catch {
      // retry
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">加载中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="text-center">
          <p className="text-ink-400 mb-4">暂无问卷</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <div className="bg-paper border-b border-ink-200 px-4 py-3">
        <ProgressBar
          current={currentIdx + 1}
          total={questions.length}
          label={phase === 'pre_test' ? '行为测试' : '认知测试'}
        />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-up" key={currentIdx}>
          {/* Phase tag */}
          <div className="mb-3">
            <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-600 text-xs font-medium rounded">
              {phase === 'pre_test' ? '前测' : '后测'}
            </span>
          </div>

          <div className="card p-6 mb-4">
            <p className="font-mono text-sm text-ink-400 mb-2">
              {currentIdx + 1} / {questions.length}
            </p>
            <h3 className="text-lg font-medium text-ink-900 mb-6 leading-relaxed">{currentQ.text}</h3>

            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                let extra = '';
                if (feedback && selected === opt.key) {
                  extra = feedback.is_correct ? ' (correct)' : ' (incorrect)';
                }
                return (
                  <RadioOptionCard
                    key={opt.key}
                    label={`${opt.key}. ${opt.text}${extra}`}
                    selected={selected === opt.key}
                    onClick={() => handleSelect(opt.key)}
                    disabled={!!feedback || submitting}
                  />
                );
              })}
            </div>
          </div>

          {feedback?.show_explanation && feedback.explanation && (
            <div className="mb-4">
              <AlertBanner
                type={feedback.is_correct ? 'success' : 'info'}
                message={feedback.explanation}
              />
            </div>
          )}

          {feedback && (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full btn-primary"
            >
              {submitting ? '提交中...' : isLast ? '查看结果' : '下一题'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

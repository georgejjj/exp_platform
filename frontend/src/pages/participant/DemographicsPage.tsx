import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDemographics } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useEventLogger } from '../../hooks/useEventLogger';
import ProgressBar from '../../components/shared/ProgressBar';
import RadioOptionCard from '../../components/shared/RadioOptionCard';

const FIELDS = [
  {
    key: 'gender',
    label: '您的性别',
    options: [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' },
      { value: 'other', label: '其他' },
    ],
  },
  {
    key: 'age_range',
    label: '您的年龄',
    options: [
      { value: '18-24', label: '18-24岁' },
      { value: '25-34', label: '25-34岁' },
      { value: '35-44', label: '35-44岁' },
      { value: '45-54', label: '45-54岁' },
      { value: '55+', label: '55岁以上' },
    ],
  },
  {
    key: 'education_level',
    label: '您的学历',
    options: [
      { value: 'high_school', label: '高中及以下' },
      { value: 'bachelor', label: '本科' },
      { value: 'master', label: '硕士' },
      { value: 'phd', label: '博士' },
    ],
  },
  {
    key: 'investment_experience',
    label: '您的投资经验',
    options: [
      { value: 'none', label: '无投资经验' },
      { value: 'beginner', label: '1年以下' },
      { value: 'intermediate', label: '1-5年' },
      { value: 'advanced', label: '5年以上' },
    ],
  },
  {
    key: 'risk_preference',
    label: '您的风险偏好',
    options: [
      { value: 'conservative', label: '保守型 - 不愿承担风险' },
      { value: 'moderate', label: '稳健型 - 愿意承担适度风险' },
      { value: 'aggressive', label: '进取型 - 愿意承担较高风险' },
    ],
  },
];

export default function DemographicsPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setStep: setAuthStep } = useAuth();
  const { log } = useEventLogger();

  const current = FIELDS[step];
  const isLast = step === FIELDS.length - 1;

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
    log('demographics_answer', 'demographics', { field: current.key, value });
  };

  const handleNext = async () => {
    if (!answers[current.key]) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setLoading(true);
    try {
      await submitDemographics({
        gender: answers.gender,
        age_range: answers.age_range,
        education_level: answers.education_level,
        investment_experience: answers.investment_experience,
        risk_preference: answers.risk_preference,
      });
      setAuthStep('pre_test');
      navigate('/questionnaire/pre_test');
    } catch {
      // allow retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <div className="bg-paper border-b border-ink-200 px-4 py-3">
        <ProgressBar current={step + 1} total={FIELDS.length} label="基本信息" />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {FIELDS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              i === step ? 'bg-amber-500' : i < step ? 'bg-amber-300' : 'bg-ink-200'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-up" key={step}>
          <h2 className="text-xl font-serif font-bold text-ink-900 mb-6">{current.label}</h2>
          <div className="space-y-3">
            {current.options.map((opt) => (
              <RadioOptionCard
                key={opt.value}
                label={opt.label}
                selected={answers[current.key] === opt.value}
                onClick={() => handleSelect(opt.value)}
              />
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 btn-secondary"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!answers[current.key] || loading}
              className="flex-1 btn-primary"
            >
              {loading ? '提交中...' : isLast ? '开始测试' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

from pydantic import BaseModel


class QuestionOption(BaseModel):
    key: str
    text: str


class QuestionItem(BaseModel):
    id: str
    text: str
    options: list[QuestionOption]
    category: str | None = None


class QuestionnaireOut(BaseModel):
    questionnaire_id: str
    phase: str
    questions: list[QuestionItem]
    total: int


class AnswerRequest(BaseModel):
    questionnaire_id: str
    question_id: str
    selected_option: str
    response_time_ms: int | None = None


class AnswerResponse(BaseModel):
    is_correct: bool | None
    explanation: str | None = None
    show_explanation: bool = False


class CompleteRequest(BaseModel):
    questionnaire_id: str


class CompleteResponse(BaseModel):
    score: float
    total_questions: int
    correct_count: int
    bias_level: str | None = None
    next_step: str

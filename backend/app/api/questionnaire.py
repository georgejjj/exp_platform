from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.experiment import Experiment
from app.models.participant import Participant
from app.models.questionnaire import Questionnaire, QuestionnaireResponse
from app.schemas.questionnaire import (
    AnswerRequest,
    AnswerResponse,
    CompleteRequest,
    CompleteResponse,
    QuestionItem,
    QuestionnaireOut,
    QuestionOption,
)
from app.services.fallacy_scorer import calculate_cognitive_score, determine_bias_level

router = APIRouter(prefix="/api/questionnaire", tags=["questionnaire"])


@router.get("/{phase}", response_model=QuestionnaireOut)
async def get_questionnaire(
    phase: str,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Questionnaire).where(
            Questionnaire.experiment_id == participant.experiment_id,
            Questionnaire.phase == phase,
        )
    )
    questionnaire = result.scalar_one_or_none()
    if not questionnaire:
        raise HTTPException(status_code=404, detail=f"未找到 {phase} 阶段的问卷")

    questions = []
    for q in questionnaire.questions:
        options = [QuestionOption(key=o["key"], text=o["text"]) for o in q["options"]]
        questions.append(QuestionItem(
            id=q["id"], text=q["text"], options=options, category=q.get("category"),
        ))

    return QuestionnaireOut(
        questionnaire_id=str(questionnaire.id),
        phase=phase,
        questions=questions,
        total=len(questions),
    )


@router.post("/{phase}/answer", response_model=AnswerResponse)
async def submit_answer(
    phase: str,
    req: AnswerRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Questionnaire).where(Questionnaire.id == req.questionnaire_id)
    )
    questionnaire = result.scalar_one_or_none()
    if not questionnaire:
        raise HTTPException(status_code=404, detail="问卷不存在")

    question = next(
        (q for q in questionnaire.questions if q["id"] == req.question_id), None
    )
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    correct_option = next(
        (o for o in question["options"] if o.get("is_correct")), None
    )
    is_correct = correct_option is not None and req.selected_option == correct_option["key"]

    response = QuestionnaireResponse(
        participant_id=participant.id,
        questionnaire_id=questionnaire.id,
        question_id=req.question_id,
        phase=phase,
        selected_option=req.selected_option,
        is_correct=is_correct,
        response_time_ms=req.response_time_ms,
    )
    db.add(response)
    await db.commit()

    experiment = await db.get(Experiment, participant.experiment_id)
    show_explanation = (
        experiment.config.get("show_explanations", False) if experiment else False
    )

    return AnswerResponse(
        is_correct=is_correct,
        explanation=question.get("explanation") if show_explanation else None,
        show_explanation=show_explanation,
    )


@router.post("/{phase}/complete", response_model=CompleteResponse)
async def complete_questionnaire(
    phase: str,
    req: CompleteRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QuestionnaireResponse).where(
            QuestionnaireResponse.participant_id == participant.id,
            QuestionnaireResponse.phase == phase,
        )
    )
    responses = result.scalars().all()
    response_dicts = [{"is_correct": r.is_correct} for r in responses]
    score, correct, total = calculate_cognitive_score(response_dicts)

    bias_level = None
    if phase == "pre_test":
        bias_level = determine_bias_level(100 - score)
        participant.bias_level = bias_level
        participant.current_step = "personality_feedback"
        next_step = "personality_feedback"
    else:
        participant.current_step = "analysis"
        next_step = "analysis"

    await db.commit()

    return CompleteResponse(
        score=score,
        total_questions=total,
        correct_count=correct,
        bias_level=bias_level,
        next_step=next_step,
    )

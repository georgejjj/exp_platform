from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.education import EducationContent
from app.models.participant import Participant
from app.schemas.education import EducationContentOut, EducationExample, EducationSection

router = APIRouter(prefix="/api/education", tags=["education"])


DEFAULT_SECTIONS = [
    EducationSection(
        heading="什么是赌徒谬误？",
        body=(
            "赌徒谬误是一种常见的认知偏差，指人们错误地认为独立随机事件之间存在某种联系。"
            "例如，认为连续多次出现正面后，下一次出现反面的概率更大。"
        ),
    ),
    EducationSection(
        heading="为什么会产生赌徒谬误？",
        body=(
            "这主要源于人类大脑对随机性的错误理解。我们倾向于寻找模式，即使在完全随机的数据中也是如此。"
            "在投资中，这可能导致我们基于过去的价格走势做出错误的判断。"
        ),
    ),
    EducationSection(
        heading="如何避免赌徒谬误？",
        body=(
            "1. 认识到每次价格变动都是独立事件\n"
            "2. 关注基本面分析而非价格模式\n"
            "3. 制定投资计划并严格执行\n"
            "4. 在做决策前停下来思考是否受到了近期走势的影响"
        ),
    ),
]

DEFAULT_TAKEAWAYS = [
    "独立事件的概率不会因为之前的结果而改变",
    "连续上涨不意味着下一期更可能下跌",
    "连续下跌不意味着下一期更可能上涨",
    "理性投资应基于概率分析，而非直觉判断",
]

DEFAULT_EXAMPLES = [
    EducationExample(
        scenario="一只股票连续5天上涨，有人认为第6天一定会下跌",
        correct_thinking="如果每天的涨跌是独立的，那么第6天上涨或下跌的概率与之前5天的走势无关",
    ),
]


@router.get("/content", response_model=EducationContentOut)
async def get_education_content(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    group = participant.group or "control"
    bias_level = participant.bias_level or "mild"

    if group in ("feedback", "feedback_guidance"):
        target_bias = bias_level
    else:
        target_bias = "generic"

    result = await db.execute(
        select(EducationContent).where(
            EducationContent.experiment_id == participant.experiment_id,
            EducationContent.bias_level == target_bias,
            EducationContent.group_type == group,
        )
    )
    content = result.scalar_one_or_none()

    if not content:
        result = await db.execute(
            select(EducationContent).where(
                EducationContent.experiment_id == participant.experiment_id,
                EducationContent.bias_level == "generic",
            )
        )
        content = result.scalar_one_or_none()

    if not content:
        return EducationContentOut(
            title="认识赌徒谬误",
            bias_level=target_bias,
            version="text",
            sections=DEFAULT_SECTIONS,
            key_takeaways=DEFAULT_TAKEAWAYS,
            examples=DEFAULT_EXAMPLES,
        )

    data = content.content
    sections = [EducationSection(**s) for s in data.get("sections", [])]
    examples = [EducationExample(**e) for e in data.get("examples", [])]

    participant.current_step = "phase2_trading"
    await db.commit()

    return EducationContentOut(
        title=content.title,
        bias_level=content.bias_level,
        version=content.version,
        sections=sections,
        key_takeaways=data.get("key_takeaways", []),
        examples=examples,
    )

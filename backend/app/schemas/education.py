from pydantic import BaseModel


class EducationSection(BaseModel):
    heading: str
    body: str
    image_url: str | None = None


class EducationExample(BaseModel):
    scenario: str
    correct_thinking: str


class EducationContentOut(BaseModel):
    title: str
    bias_level: str
    version: str
    sections: list[EducationSection]
    key_takeaways: list[str]
    examples: list[EducationExample]

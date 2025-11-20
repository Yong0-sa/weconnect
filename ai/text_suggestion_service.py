"""
AI 글작성 도우미 - 문장 추천 서비스

농장주가 공지사항 작성 시 현재 내용을 기반으로 이어질 문장을 제안합니다.
OpenAI API를 사용하여 2개의 자연스러운 문장을 생성합니다.
"""

import os
from typing import List
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


class TextSuggestionError(RuntimeError):
    """문장 추천 관련 오류"""


class TextSuggestionService:
    """
    OpenAI API를 사용한 문장 추천 서비스
    농장 공지사항 작성에 특화된 프롬프트 사용
    """

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 200,
    ):
        """
        Args:
            model: OpenAI 모델명 (기본: gpt-4o-mini, 빠르고 저렴)
            temperature: 창의성 수준 (0.0~1.0, 기본: 0.7)
            max_tokens: 최대 토큰 수 (기본: 200, 2개 문장용)
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise TextSuggestionError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")

        self._client = OpenAI(api_key=api_key)
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens

    def get_suggestions(self, content: str) -> List[str]:
        """
        현재 작성 중인 내용을 기반으로 2개의 문장 제안

        Args:
            content: 사용자가 작성 중인 텍스트

        Returns:
            2개의 추천 문장 리스트

        Raises:
            TextSuggestionError: OpenAI API 호출 실패 시
        """
        if not content or not content.strip():
            raise TextSuggestionError("내용이 비어있습니다.")

        prompt = self._build_prompt(content.strip())

        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 농장 공지사항 작성을 돕는 AI 비서입니다. "
                            "농장주가 작성 중인 내용을 보고, 자연스럽게 이어질 수 있는 "
                            "짧고 명확한 문장 2개를 제안합니다. "
                            "각 문장은 1-2줄 정도로 간결하게 작성하고, "
                            "농장 운영, 작물 재배, 회원 안내 등의 맥락에 적합해야 합니다."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=self._temperature,
                max_tokens=self._max_tokens,
                n=1,  # 1개 응답만 요청
            )

            # GPT 응답 파싱
            suggestions_text = response.choices[0].message.content.strip()
            suggestions = self._parse_suggestions(suggestions_text)

            # 정확히 2개 반환 보장
            if len(suggestions) < 2:
                # 부족하면 빈 문자열 추가
                suggestions.extend([""] * (2 - len(suggestions)))
            elif len(suggestions) > 2:
                # 초과하면 앞 2개만
                suggestions = suggestions[:2]

            return suggestions

        except Exception as exc:
            raise TextSuggestionError(f"문장 추천 중 오류 발생: {exc}") from exc

    def _build_prompt(self, content: str) -> str:
        """
        OpenAI에 보낼 프롬프트 구성

        Args:
            content: 사용자가 작성 중인 내용

        Returns:
            프롬프트 문자열
        """
        return (
            f"다음은 농장주가 작성 중인 공지사항 내용입니다:\n\n"
            f"```\n{content}\n```\n\n"
            f"이 내용 뒤에 자연스럽게 이어질 수 있는 문장 2개를 제안해주세요.\n"
            f"각 문장은 1-2줄로 간결하게 작성하고, 번호 없이 줄바꿈으로 구분해주세요.\n"
            f"농장 운영, 작물 재배, 회원 안내 등의 맥락에 맞춰주세요."
        )

    def _parse_suggestions(self, text: str) -> List[str]:
        """
        GPT 응답 텍스트를 문장 리스트로 파싱

        Args:
            text: GPT가 반환한 원본 텍스트

        Returns:
            파싱된 문장 리스트
        """
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 번호 매겨진 경우 제거 (예: "1. 문장", "- 문장" 등)
        suggestions = []
        for line in lines:
            # 숫자 + 점 + 공백 패턴 제거
            cleaned = line
            if len(line) > 2 and line[0].isdigit() and line[1] in ".):":
                cleaned = line[2:].strip()
            # 대시/별표 시작 제거
            elif line.startswith(("- ", "* ", "• ")):
                cleaned = line[2:].strip()

            if cleaned:
                suggestions.append(cleaned)

        return suggestions

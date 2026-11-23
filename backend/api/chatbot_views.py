import requests

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status


class SafeTripChatbotAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        message = request.data.get("message", "").strip()

        if not message:
            return Response(
                {"error": "Please enter a message."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message) > 2000:
            return Response(
                {"error": "Message is too long. Maximum 2000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        system_prompt = """
You are SafeTrip AI, a professional Karnataka travel assistant.

Help users with:
- Karnataka tourist destinations
- Trip planning and itineraries
- Travel budgets
- Transportation and routes
- General travel safety
- Food, culture and activities

Instructions:
- Use simple, friendly English.
- Give direct and useful answers.
- Prefer short answers with bullet points.
- Avoid unnecessary introductions.
- Keep answers focused on Karnataka.
- Ask questions only when essential information is missing.
- Never invent live traffic, weather, opening hours or safety conditions.
- Mention when information needs verification.
- Keep responses under 200 words unless more detail is requested.
"""

        try:

            response = requests.post(
                "http://127.0.0.1:11434/api/chat",
                json={
                    "model": "gemma3:4b",
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": message
                        }
                    ],
                    "stream": False,
                    "keep_alive": "10m",
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 220,
                        "num_ctx": 2048
                    }
                },
                timeout=60
            )

            response.raise_for_status()

            ai_response = response.json()["message"]["content"]

            return Response({
                "reply": ai_response
            })

        except requests.exceptions.ConnectionError:

            return Response(
                {"error": "Ollama is not running. Please start Ollama."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except requests.exceptions.Timeout:

            return Response(
                {"error": "AI is taking too long. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

        except requests.exceptions.RequestException:

            return Response(
                {"error": "Unable to generate an AI response."},
                status=status.HTTP_502_BAD_GATEWAY
            )
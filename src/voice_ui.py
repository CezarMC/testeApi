from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components


def render_voice_widget(
    start_muted: bool = False,
    latest_response: str = "",
    latest_language: str = "pt-BR",
) -> None:
    safe_latest_response = (
        latest_response.replace("\\", "\\\\").replace("`", "'").replace("\n", " ")
    )
    safe_language = latest_language or "pt-BR"
    components.html(
        f"""
        <div style=\"padding:16px;border:1px solid #d8d3ca;border-radius:18px;background:#fff9f2;\">
          <div style=\"font-family:Georgia, serif;font-size:17px;margin-bottom:10px;color:#3d2c1e;\">Conversa por voz</div>
          <div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap;\">
            <button id=\"voice-orb\" onclick=\"toggleRecognition()\" style=\"width:64px;height:64px;border:none;border-radius:999px;background:#c96f3b;color:white;cursor:pointer;box-shadow:0 10px 24px rgba(201,111,59,0.35);font-size:12px;font-weight:700;\">OFF</button>
            <button id=\"voice-mute\" onclick=\"toggleVoiceMute()\" style=\"padding:10px 14px;border:none;border-radius:999px;background:#6d5d4f;color:white;cursor:pointer;\">{'Ativar voz da IA' if start_muted else 'Mutar voz da IA'}</button>
            <div style=\"font-family:Arial,sans-serif;font-size:13px;color:#5c4d40;max-width:420px;\">
              Um botao em formato de bolinha controla o microfone. Clique uma vez para ligar e outra para desligar.
            </div>
          </div>
          <p id=\"status\" style=\"font-family:Arial, sans-serif;font-size:13px;color:#5c4d40;margin-top:12px;\">Use Chrome ou Edge para melhor suporte a voz em portugues.</p>
        </div>
        <script>
          let recognition;
          let listening = false;
          let voiceMuted = {str(start_muted).lower()};
          const latestResponse = `{safe_latest_response}`;
          const latestLanguage = `{safe_language}`;

          if (!window.parent.__marketingVoiceState) {{
            window.parent.__marketingVoiceState = {{
              lastSpoken: '',
              muted: voiceMuted,
            }};
          }}
          if (typeof window.parent.__marketingVoiceState.muted === 'boolean') {{
            voiceMuted = window.parent.__marketingVoiceState.muted;
          }}

          function pickVoice(languageCode) {{
            const voices = window.speechSynthesis.getVoices();
            const normalized = (languageCode || 'pt-BR').toLowerCase();
            const preferred = voices.find((voice) => voice.lang.toLowerCase().includes(normalized) && /female|maria|luciana|francisca|brasil|helena|sofia/i.test(voice.name));
            if (preferred) return preferred;
            return voices.find((voice) => voice.lang.toLowerCase().includes(normalized.split('-')[0])) || null;
          }}

          function speakResponse(text) {{
            const clean = (text || '').trim();
            if (!clean || voiceMuted) return;
            if (window.parent.__marketingVoiceState.lastSpoken === clean) return;

            const wasListening = listening;
            if (recognition && listening) {{
              try {{
                recognition.onend = null;
                recognition.stop();
              }} catch (e) {{}}
            }}

            const utter = new SpeechSynthesisUtterance(clean);
            const preferred = pickVoice(latestLanguage);
            if (preferred) utter.voice = preferred;
            utter.lang = latestLanguage;
            utter.rate = 1.02;
            utter.pitch = 1.08;
            utter.onstart = function() {{
              document.getElementById('status').innerText = 'A IA esta falando com voce...';
            }};
            utter.onend = function() {{
              window.parent.__marketingVoiceState.lastSpoken = clean;
              document.getElementById('status').innerText = wasListening ? 'Voltando a te ouvir...' : 'Resposta em voz concluida.';
              if (wasListening) {{
                startRecognition(true);
              }}
            }};
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
          }}

          function updateOrb() {{
            const orb = document.getElementById('voice-orb');
            if (!orb) return;
            if (listening) {{
              orb.innerText = 'ON';
              orb.style.background = '#1f6f5f';
              orb.style.transform = 'scale(1.06)';
              orb.style.boxShadow = '0 0 0 12px rgba(31,111,95,0.12), 0 10px 24px rgba(31,111,95,0.35)';
            }} else {{
              orb.innerText = 'OFF';
              orb.style.background = '#c96f3b';
              orb.style.transform = 'scale(1)';
              orb.style.boxShadow = '0 10px 24px rgba(201,111,59,0.35)';
            }}
          }}

          function findChatTextarea() {{
            const areas = window.parent.document.querySelectorAll('textarea');
            return areas.length ? areas[areas.length - 1] : null;
          }}

          function findSendButton() {{
            const buttons = Array.from(window.parent.document.querySelectorAll('button'));
            return buttons.find((button) => {{
              const label = (button.getAttribute('aria-label') || button.innerText || button.title || '').toLowerCase();
              return label.includes('send') || label.includes('enviar');
            }});
          }}

          function injectTextAndSubmit(texto) {{
            const area = findChatTextarea();
            if (!area) {{
              document.getElementById('status').innerText = 'Nao foi possivel encontrar o campo de chat.';
              return;
            }}

            area.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(area, texto);
            area.dispatchEvent(new Event('input', {{ bubbles: true }}));

            const sendButton = findSendButton();
            if (sendButton) {{
              setTimeout(() => sendButton.click(), 120);
              document.getElementById('status').innerText = 'Pergunta enviada por voz: ' + texto;
            }} else {{
              document.getElementById('status').innerText = 'Texto capturado. Envie manualmente se o botao nao aparecer.';
            }}
          }}

          function startRecognition(fromResume = false) {{
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {{
              document.getElementById('status').innerText = 'Reconhecimento de voz nao suportado neste navegador.';
              return;
            }}
            if (recognition && !fromResume) {{
              try {{ recognition.stop(); }} catch (e) {{}}
            }}
            recognition = new SpeechRecognition();
            recognition.lang = latestLanguage || 'pt-BR';
            recognition.interimResults = true;
            recognition.continuous = true;
            recognition.maxAlternatives = 1;
            recognition.onresult = function(event) {{
              let parcial = '';
              let finalTexto = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {{
                const trecho = event.results[i][0].transcript;
                if (event.results[i].isFinal) {{
                  finalTexto += trecho + ' ';
                }} else {{
                  parcial += trecho;
                }}
              }}
              if (parcial) {{
                document.getElementById('status').innerText = 'Ouvindo em tempo real: ' + parcial;
              }}
              if (finalTexto.trim()) {{
                injectTextAndSubmit(finalTexto.trim());
              }}
            }};
            recognition.onerror = function() {{
              document.getElementById('status').innerText = 'Erro ao capturar audio.';
            }};
            recognition.onend = function() {{
              if (listening) {{
                try {{
                  recognition.start();
                }} catch (e) {{}}
              }}
            }};
            recognition.start();
            listening = true;
            updateOrb();
            document.getElementById('status').innerText = 'Ouvindo voce...';
          }}

          function stopRecognition() {{
            listening = false;
            updateOrb();
            if (recognition) {{
              recognition.stop();
              document.getElementById('status').innerText = 'Microfone pausado.';
            }}
          }}

          function toggleRecognition() {{
            if (listening) {{
              stopRecognition();
            }} else {{
              startRecognition();
            }}
          }}

          function toggleVoiceMute() {{
            voiceMuted = !voiceMuted;
            const button = document.getElementById('voice-mute');
            if (voiceMuted) {{
              window.speechSynthesis.cancel();
              button.innerText = 'Ativar voz da IA';
              document.getElementById('status').innerText = 'Voz da IA silenciada.';
            }} else {{
              button.innerText = 'Mutar voz da IA';
              document.getElementById('status').innerText = 'Voz da IA ativada.';
              speakResponse(latestResponse);
            }}
            window.parent.voiceMarketingMuted = voiceMuted;
            window.parent.__marketingVoiceState.muted = voiceMuted;
          }}

          window.parent.voiceMarketingMuted = voiceMuted;
          window.parent.__marketingVoiceState.muted = voiceMuted;
          updateOrb();
          speakResponse(latestResponse);
        </script>
        """,
        height=170,
    )


def render_tts_button(text: str, button_id: str) -> None:
    safe_text = text.replace("\\", "\\\\").replace("`", "'").replace("\n", " ")
    st.markdown(
        f"""
        <button id=\"{button_id}\" onclick=\"(function(){{
          const utter = new SpeechSynthesisUtterance(`{safe_text}`);
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find((voice) => voice.lang.toLowerCase().includes('pt-br') && /female|maria|luciana|francisca|brasil/i.test(voice.name)) || voices.find((voice) => voice.lang.toLowerCase().includes('pt'));
          if (preferred) utter.voice = preferred;
          utter.lang = 'pt-BR';
          utter.rate = 1.02;
          utter.pitch = 1.08;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }})()\" style=\"padding:10px 14px;border:none;border-radius:999px;background:#1f6f5f;color:white;cursor:pointer;\">Ouvir resposta</button>
        """,
        unsafe_allow_html=True,
    )


def render_auto_tts(text: str, element_id: str) -> None:
    del text, element_id

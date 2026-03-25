from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components


def render_voice_widget(
    start_muted: bool = False,
    start_microphone_paused: bool = True,
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
          <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;\">
            <div style=\"display:flex;align-items:center;gap:8px;\">
              <label for=\"voice-volume\" style=\"min-width:128px;font-family:Arial,sans-serif;font-size:12px;color:#5c4d40;\">Volume da voz IA</label>
              <input id=\"voice-volume\" type=\"range\" min=\"0\" max=\"100\" value=\"85\" oninput=\"updateVoiceVolume(this.value)\" style=\"flex:1;\"/>
              <span id=\"voice-volume-value\" style=\"min-width:38px;font-family:Arial,sans-serif;font-size:12px;color:#5c4d40;\">85%</span>
            </div>
            <div style=\"display:flex;align-items:center;gap:8px;\">
              <label for=\"mic-sensitivity\" style=\"min-width:128px;font-family:Arial,sans-serif;font-size:12px;color:#5c4d40;\">Sensibilidade de captura</label>
              <input id=\"mic-sensitivity\" type=\"range\" min=\"0\" max=\"100\" value=\"55\" oninput=\"updateMicSensitivity(this.value)\" style=\"flex:1;\"/>
              <span id=\"mic-sensitivity-value\" style=\"min-width:38px;font-family:Arial,sans-serif;font-size:12px;color:#5c4d40;\">55%</span>
            </div>
          </div>
          <p id=\"status\" style=\"font-family:Arial, sans-serif;font-size:13px;color:#5c4d40;margin-top:12px;\">Use Chrome ou Edge para melhor suporte a voz em portugues.</p>
        </div>
        <script>
          let recognition;
          let listening = false;
          let voiceMuted = {str(start_muted).lower()};
          const startMicrophonePaused = {str(start_microphone_paused).lower()};
          let voiceVolume = 0.85;
          let micSensitivity = 0.55;
          let pendingFinalText = '';
          let sendTimer = null;
          const latestResponse = `{safe_latest_response}`;
          const latestLanguage = `{safe_language}`;

          function getParentDocument() {{
            try {{
              return window.parent.document;
            }} catch (e) {{
              return null;
            }}
          }}

          if (!window.parent.__marketingVoiceState) {{
            window.parent.__marketingVoiceState = {{
              lastSpoken: '',
              muted: voiceMuted,
              voiceVolume: voiceVolume,
              micSensitivity: micSensitivity,
            }};
          }}
          if (typeof window.parent.__marketingVoiceState.muted === 'boolean') {{
            voiceMuted = window.parent.__marketingVoiceState.muted;
          }}
          if (typeof window.parent.__marketingVoiceState.voiceVolume === 'number') {{
            voiceVolume = window.parent.__marketingVoiceState.voiceVolume;
          }}
          if (typeof window.parent.__marketingVoiceState.micSensitivity === 'number') {{
            micSensitivity = window.parent.__marketingVoiceState.micSensitivity;
          }}

          function updateVoiceVolume(rawValue) {{
            const sliderValue = Number(rawValue);
            voiceVolume = Math.max(0, Math.min(1, sliderValue / 100));
            document.getElementById('voice-volume-value').innerText = String(Math.round(voiceVolume * 100)) + '%';
            window.parent.__marketingVoiceState.voiceVolume = voiceVolume;
          }}

          function updateMicSensitivity(rawValue) {{
            const sliderValue = Number(rawValue);
            micSensitivity = Math.max(0, Math.min(1, sliderValue / 100));
            document.getElementById('mic-sensitivity-value').innerText = String(Math.round(micSensitivity * 100)) + '%';
            window.parent.__marketingVoiceState.micSensitivity = micSensitivity;
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
            utter.volume = voiceVolume;
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
            const doc = getParentDocument();
            if (!doc) return null;

            const preferred = doc.querySelector('textarea[data-testid="stChatInputTextArea"]');
            if (preferred) return preferred;

            const areas = doc.querySelectorAll('textarea');
            if (areas.length) return areas[areas.length - 1];

            const contentEditable = doc.querySelector('[contenteditable="true"]');
            return contentEditable || null;
          }}

          function findSendButton(targetArea) {{
            const doc = getParentDocument();
            if (!doc) return null;

            if (targetArea) {{
              const nearButtons = targetArea.parentElement ? Array.from(targetArea.parentElement.querySelectorAll('button')) : [];
              const labeledNear = nearButtons.find((button) => {{
                const label = (button.getAttribute('aria-label') || button.innerText || button.title || '').toLowerCase();
                return label.includes('send') || label.includes('enviar') || label.includes('submit');
              }});
              if (labeledNear) return labeledNear;
              if (nearButtons.length) return nearButtons[nearButtons.length - 1];
            }}

            const allButtons = Array.from(doc.querySelectorAll('button'));
            const labeledGlobal = allButtons.find((button) => {{
              const label = (button.getAttribute('aria-label') || button.innerText || button.title || '').toLowerCase();
              return label.includes('send') || label.includes('enviar') || label.includes('submit');
            }});
            if (labeledGlobal) return labeledGlobal;

            return null;
          }

          function setInputValue(area, texto) {{
            if (area instanceof window.HTMLTextAreaElement) {{
              const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
              if (setter) setter.call(area, texto);
              else area.value = texto;
            }} else if (area instanceof window.HTMLInputElement) {{
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (setter) setter.call(area, texto);
              else area.value = texto;
            }} else if (area.getAttribute && area.getAttribute('contenteditable') === 'true') {{
              area.textContent = texto;
            }}

            area.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: texto, inputType: 'insertText' }}));
            area.dispatchEvent(new Event('change', {{ bubbles: true }}));
          }

          function trySubmitByEnter(area) {{
            const keyDown = new KeyboardEvent('keydown', {{ key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }});
            const keyUp = new KeyboardEvent('keyup', {{ key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }});
            area.dispatchEvent(keyDown);
            area.dispatchEvent(keyUp);
          }

          function trySubmitByForm(area) {{
            const form = area.closest ? area.closest('form') : null;
            if (!form) return false;
            try {{
              if (typeof form.requestSubmit === 'function') {{
                form.requestSubmit();
                return true;
              }}
              form.dispatchEvent(new Event('submit', {{ bubbles: true, cancelable: true }}));
              return true;
            }} catch (e) {{
              return false;
            }}
          }

          function injectTextAndSubmit(texto) {{
            const area = findChatTextarea();
            if (!area) {{
              document.getElementById('status').innerText = 'Nao achei o campo de chat para enviar por voz.';
              return;
            }}

            const cleanText = (texto || '').trim();
            if (!cleanText) return;
            area.focus();
            setInputValue(area, cleanText);

            const attemptSend = (delayMs) => {{
              setTimeout(() => {{
                const sendButton = findSendButton(area);
                if (sendButton) {{
                  sendButton.click();
                }} else {{
                  trySubmitByEnter(area);
                  trySubmitByForm(area);
                }}
              }}, delayMs);
            }};

            attemptSend(80);
            attemptSend(260);
            attemptSend(520);
            document.getElementById('status').innerText = 'Pergunta enviada por voz: ' + cleanText;
          }}

          function enqueueFinalText(texto) {{
            const clean = (texto || '').trim();
            if (!clean) return;
            pendingFinalText = (pendingFinalText + ' ' + clean).trim();
            if (sendTimer) clearTimeout(sendTimer);
            sendTimer = setTimeout(() => {{
              injectTextAndSubmit(pendingFinalText);
              pendingFinalText = '';
              sendTimer = null;
            }}, 900);
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
              let melhorConfianca = 0;
              for (let i = event.resultIndex; i < event.results.length; i++) {{
                const trecho = event.results[i][0].transcript;
                const confianca = typeof event.results[i][0].confidence === 'number' ? event.results[i][0].confidence : 1;
                melhorConfianca = Math.max(melhorConfianca, confianca);
                if (event.results[i].isFinal) {{
                  const confiancaMinima = Math.max(0.0, 0.35 - (micSensitivity * 0.30));
                  if (confianca >= confiancaMinima) {{
                    finalTexto += trecho + ' ';
                  }}
                }} else {{
                  parcial += trecho;
                }}
              }}
              if (parcial) {{
                document.getElementById('status').innerText = 'Ouvindo em tempo real: ' + parcial;
              }}
              if (finalTexto.trim()) {{
                enqueueFinalText(finalTexto.trim());
              }} else if (melhorConfianca > 0) {{
                document.getElementById('status').innerText = 'Audio captado com baixa confianca. Tente falar mais perto do microfone.';
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

          function syncMuteButton() {{
            const button = document.getElementById('voice-mute');
            if (!button) return;
            button.innerText = voiceMuted ? 'Ativar voz da IA' : 'Mutar voz da IA';
          }}

          window.parent.voiceMarketingMuted = voiceMuted;
          window.parent.__marketingVoiceState.muted = voiceMuted;
          document.getElementById('voice-volume').value = String(Math.round(voiceVolume * 100));
          document.getElementById('mic-sensitivity').value = String(Math.round(micSensitivity * 100));
          updateVoiceVolume(Math.round(voiceVolume * 100));
          updateMicSensitivity(Math.round(micSensitivity * 100));
          syncMuteButton();
          updateOrb();
          if (!startMicrophonePaused) {{
            startRecognition();
          }}
          speakResponse(latestResponse);
        </script>
        """,
        height=250,
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
          const sharedState = (window.parent && window.parent.__marketingVoiceState) ? window.parent.__marketingVoiceState : null;
          utter.volume = sharedState && typeof sharedState.voiceVolume === 'number' ? sharedState.voiceVolume : 0.85;
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

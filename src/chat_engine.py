from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

import pandas as pd

from src.intent_engine import classificar_intencao, eh_tema_marketing


@dataclass
class PerfilUsuario:
    nome: str = ""
    objetivo: str = "gerar mais resultados com seguranca"
    tom: str = "consultivo"
    cliente_nome: str = ""
    cliente_nicho: str = ""
    cliente_objetivo: str = ""
    cliente_pedido: str = ""
    cliente_restricoes: str = ""


LANGUAGE_CONFIG = {
    "pt": {
        "openings": {
            "consultivo": "Vou organizar isso com voce de um jeito claro e pratico.",
            "acolhedor": "Vamos por partes, com calma, mas sem perder o rumo.",
            "direto": "Vou direto ao ponto.",
            "animado": "Vamos destravar isso com energia, mas com criterio.",
        },
        "closings": {
            "consultivo": "Se quiser, eu transformo isso em um proximo passo bem objetivo.",
            "acolhedor": "Se fizer sentido, eu sigo com voce e deixo isso leve de entender.",
            "direto": "Se quiser, eu resumo isso em 3 acoes praticas.",
            "animado": "Se quiser, eu ja puxo isso para um plano de acao simples.",
        },
        "recent_prefix": "O que voce vem perguntando mais recentemente gira em torno de: ",
        "no_data": "Ainda nao existem metricas carregadas. Trabalhe em modo consultivo geral.",
        "summary": "Investimento total: R$ {investimento:,.2f}. Cliques: {cliques}. Conversoes: {conversoes:,.2f}. CTR medio: {ctr:,.2f}%. Plataforma com maior investimento: {plataforma}. Campanha com maior volume de conversoes: {campanha}.",
        "ctr": "Olhando para os dados atuais, {contexto} {memoria}Se o foco for CTR, eu sugiro revisar criativos, texto do anuncio e aderencia entre publico e oferta. A regra pratica e: primeiro melhorar a mensagem, depois segmentacao, e so entao escalar investimento. {fechamento}",
        "conversion": "Vendo o quadro atual, {contexto} {memoria}Para aumentar conversoes, eu atacaria tres pontos: pagina de destino, qualificacao do trafego e remarketing. Se quiser, eu posso transformar isso em um plano de acao de 7 dias. {fechamento}",
        "platform": "Hoje o contexto e este: {contexto} {memoria}Eu compararia plataforma por plataforma usando custo por aquisicao, volume de conversao e consistencia diaria. Nao vale decidir so por cliques; o melhor canal e o que converte com previsibilidade. {fechamento}",
        "next_step": "Meu conselho inicial e objetivo: 1) identificar as campanhas com maior conversao, 2) pausar desperdicio evidente, 3) testar nova variacao de criativo e 4) reforcar audiencia de remarketing. Contexto usado: {contexto} {memoria}{fechamento}",
        "default": "Eu posso conversar com voce de forma natural e te ajudar a organizar raciocinio, decisoes e contexto. Quando fizer sentido, eu entro em marketing, metricas e operacao. Contexto atual: {contexto} {memoria}{fechamento}",
    },
    "en": {
        "openings": {
            "consultivo": "I will answer as a marketing consultant, clearly and with decision focus.",
            "acolhedor": "I will answer in a warmer and lighter way without losing strategy.",
            "direto": "I will be objective and go straight to the point.",
            "animado": "I will bring positive energy and growth focus, while staying practical.",
        },
        "closings": {
            "consultivo": "If you want, I can turn this into a practical action plan now.",
            "acolhedor": "If it helps, I can keep going calmly and explain the next step clearly.",
            "direto": "If you want, I can reduce this to 3 immediate actions.",
            "animado": "If you want, I can build a quick-win growth plan right away.",
        },
        "recent_prefix": "What you have been asking about most recently is: ",
        "no_data": "There are no metrics loaded yet. Work in general consulting mode.",
        "summary": "Total spend: ${investimento:,.2f}. Clicks: {cliques}. Conversions: {conversoes:,.2f}. Average CTR: {ctr:,.2f}%. Platform with the highest spend: {plataforma}. Campaign with the highest conversion volume: {campanha}.",
        "ctr": "Looking at the current data, {contexto} {memoria}If the focus is CTR, I would review creatives, ad copy, and how well the audience matches the offer. The practical rule is: improve the message first, then targeting, and only after that scale spend. {fechamento}",
        "conversion": "Looking at the current picture, {contexto} {memoria}To increase conversions, I would attack three points: landing page, traffic qualification, and remarketing. If you want, I can turn this into a 7-day action plan. {fechamento}",
        "platform": "This is the current context: {contexto} {memoria}I would compare platform by platform using cost per acquisition, conversion volume, and day-to-day consistency. Clicks alone are not enough; the best channel is the one that converts predictably. {fechamento}",
        "next_step": "My initial recommendation is: 1) identify the highest-converting campaigns, 2) pause obvious waste, 3) test a new creative variation, and 4) reinforce remarketing audiences. Context used: {contexto} {memoria}{fechamento}",
        "default": "I can help you as a digital marketing strategist. Current context: {contexto} {memoria}You can type or talk to me by voice: both paths go into the same conversation history. If you want a stronger answer, ask me about campaigns, creatives, funnel, Meta Ads, Google Ads, leads, sales, or optimization. {fechamento}",
    },
    "es": {
        "openings": {
            "consultivo": "Voy a responder como una consultora de marketing, con claridad y foco en la decision.",
            "acolhedor": "Voy a responder de una forma mas cercana y ligera, sin perder estrategia.",
            "direto": "Voy a ser directa e ir al punto.",
            "animado": "Voy a entrar con energia positiva y vision de crecimiento, con los pies en la tierra.",
        },
        "closings": {
            "consultivo": "Si quieres, lo convierto en un plan practico ahora mismo.",
            "acolhedor": "Si te sirve, sigo con calma y te explico el siguiente paso sin complicarlo.",
            "direto": "Si quieres, lo resumo en 3 acciones inmediatas.",
            "animado": "Si quieres, te preparo un plan de ganancias rapidas para probar.",
        },
        "recent_prefix": "Lo que mas has preguntado recientemente gira en torno a: ",
        "no_data": "Todavia no hay metricas cargadas. Trabaja en modo consultivo general.",
        "summary": "Inversion total: ${investimento:,.2f}. Clics: {cliques}. Conversiones: {conversoes:,.2f}. CTR medio: {ctr:,.2f}%. Plataforma con mayor inversion: {plataforma}. Campana con mayor volumen de conversiones: {campanha}.",
        "ctr": "Mirando los datos actuales, {contexto} {memoria}Si el foco es el CTR, te sugiero revisar creativos, texto del anuncio y la relacion entre publico y oferta. La regla practica es: primero mejorar el mensaje, luego la segmentacion y solo despues escalar la inversion. {fechamento}",
        "conversion": "Viendo el panorama actual, {contexto} {memoria}Para aumentar conversiones, yo atacaria tres puntos: pagina de destino, calidad del trafico y remarketing. Si quieres, puedo convertir esto en un plan de accion de 7 dias. {fechamento}",
        "platform": "Este es el contexto actual: {contexto} {memoria}Yo compararia plataforma por plataforma usando costo por adquisicion, volumen de conversion y consistencia diaria. No vale decidir solo por clics; el mejor canal es el que convierte con previsibilidad. {fechamento}",
        "next_step": "Mi recomendacion inicial es: 1) identificar las campanas con mayor conversion, 2) pausar desperdicio evidente, 3) probar una nueva variacion creativa y 4) reforzar audiencias de remarketing. Contexto usado: {contexto} {memoria}{fechamento}",
        "default": "Puedo ayudarte como estratega de marketing digital. Contexto actual: {contexto} {memoria}Puedes escribirme o hablarme por voz: ambos caminos entran en el mismo historial de conversacion. Si quieres una respuesta mas fuerte, preguntame sobre campanas, creativos, embudo, Meta Ads, Google Ads, leads, ventas u optimizacion. {fechamento}",
    },
    "zh": {
        "openings": {
            "consultivo": "我会以营销顾问的方式回答你，清晰而且聚焦决策。",
            "acolhedor": "我会用更亲切、更轻松的方式回答，但不会失去策略性。",
            "direto": "我会直接进入重点。",
            "animado": "我会带着积极和增长导向来回答，同时保持务实。",
        },
        "closings": {
            "consultivo": "如果你愿意，我现在就可以把它变成一个可执行计划。",
            "acolhedor": "如果你觉得有帮助，我可以继续一步一步清楚说明。",
            "direto": "如果你愿意，我可以把它总结成3个立即可执行的动作。",
            "animado": "如果你愿意，我可以马上给你做一个快速增长测试计划。",
        },
        "recent_prefix": "你最近一直在问的主题主要是：",
        "no_data": "目前还没有加载任何指标。请先按通用咨询模式工作。",
        "summary": "总花费：${investimento:,.2f}。点击：{cliques}。转化：{conversoes:,.2f}。平均CTR：{ctr:,.2f}%。投放最多的平台：{plataforma}。转化最多的活动：{campanha}。",
        "ctr": "从当前数据来看，{contexto} {memoria}如果重点是CTR，我建议先检查创意、广告文案，以及受众和报价之间的匹配度。实用规则是：先优化信息表达，再优化定向，最后才扩大预算。 {fechamento}",
        "conversion": "从当前情况来看，{contexto} {memoria}如果要提升转化，我会先处理三个点：落地页、流量质量和再营销。 如果你愿意，我可以把它整理成7天行动计划。 {fechamento}",
        "platform": "当前背景是：{contexto} {memoria}我会按获客成本、转化量和日常稳定性逐个平台比较。不能只看点击量；真正好的渠道是能稳定转化的渠道。 {fechamento}",
        "next_step": "我的初步建议是：1）找出转化最高的活动，2）暂停明显浪费的部分，3）测试新的创意版本，4）加强再营销受众。 使用的背景：{contexto} {memoria}{fechamento}",
        "default": "我可以作为数字营销策略顾问帮助你。当前背景：{contexto} {memoria}你可以打字，也可以用语音和我交流，两种方式都会进入同一个对话历史。 如果你想要更有力度的建议，可以问我关于活动、创意、漏斗、Meta Ads、Google Ads、线索、销售或优化的问题。 {fechamento}",
    },
}


NAME_PATTERNS = [
    r"\bmeu nome e ([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]{1,40})",
    r"\bme chamo ([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]{1,40})",
    r"\bpode me chamar de ([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]{1,40})",
    r"\bsou o ([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]{1,40})",
    r"\bsou a ([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]{1,40})",
]

OBJECTIVE_PATTERNS = [
    r"\bmeu objetivo (?:principal )?e ([^.?!\n]{4,160})",
    r"\beu quero ([^.?!\n]{4,160})",
    r"\beu preciso ([^.?!\n]{4,160})",
    r"\bquero ([^.?!\n]{4,160})",
    r"\bpreciso ([^.?!\n]{4,160})",
]

def _normalizar_nome(nome: str) -> str:
    nome_limpo = re.split(r"[,.!?\n]", nome.strip())[0]
    tokens = [token for token in nome_limpo.split() if token.lower() not in {"beleza", "ta", "ok", "hoje", "agora"}]
    return " ".join(tokens[:2]).title().strip()


def extrair_nome_da_conversa(texto: str) -> str:
    conteudo = texto.strip()
    for pattern in NAME_PATTERNS:
        match = re.search(pattern, conteudo, flags=re.IGNORECASE)
        if match:
            nome = _normalizar_nome(match.group(1))
            if len(nome) >= 2:
                return nome
    return ""


def extrair_objetivo_da_conversa(texto: str) -> str:
    conteudo = texto.strip()
    for pattern in OBJECTIVE_PATTERNS:
        match = re.search(pattern, conteudo, flags=re.IGNORECASE)
        if match:
            objetivo = re.split(r"[.?!\n]", match.group(1).strip())[0].strip(" -:")
            if len(objetivo) >= 8:
                return objetivo[:160]
    return ""


def montar_saudacao_inicial(memoria: dict) -> str:
    nome = memoria.get("nome", "").strip()
    cliente_nome = memoria.get("cliente_nome", "").strip()
    objetivo = memoria.get("objetivo", "").strip()

    if nome and cliente_nome:
        return f"Oi, {nome}. Bom te ver de novo. Vamos trabalhar no caso de {cliente_nome} hoje ou entrou uma demanda nova?"
    if nome and objetivo:
        return f"Oi, {nome}. Bom te ver de novo. Estou lembrando que seu foco e {objetivo}. O que vamos destravar hoje?"
    if nome:
        return f"Oi, {nome}. Bom te ver de novo. O que vamos ver hoje?"
    return "Oi. A gente pode conversar de um jeito simples por aqui. Se quiser, me diga como prefere que eu te chame e eu guardo isso para as proximas conversas."


def detectar_idioma(texto: str) -> str:
    conteudo = texto.strip()
    if any("\u4e00" <= caractere <= "\u9fff" for caractere in conteudo):
        return "zh"

    texto_lower = conteudo.lower()
    sinais_es = ["hola", "campaña", "quiero", "necesito", "ventas", "conversiones", "embudo"]
    sinais_en = ["hello", "campaign", "funnel", "sales", "optimize", "marketing", "what should i do"]
    sinais_pt = ["olá", "campanha", "funil", "vendas", "otimizar", "quero", "preciso"]

    if any(sinal in texto_lower for sinal in sinais_es):
        return "es"
    if any(sinal in texto_lower for sinal in sinais_en):
        return "en"
    if any(sinal in texto_lower for sinal in sinais_pt):
        return "pt"
    return "pt"


def _ajuste_de_tom(tom: str, idioma: str) -> tuple[str, str]:
    config = LANGUAGE_CONFIG.get(idioma, LANGUAGE_CONFIG["pt"])
    return (
        config["openings"].get(tom, config["openings"]["consultivo"]),
        config["closings"].get(tom, config["closings"]["consultivo"]),
    )


def _ultima_interacao(historico: Iterable[dict[str, str]], idioma: str) -> str:
    itens = list(historico)
    if len(itens) < 2:
        return ""

    ultimos_textos = [item["content"] for item in itens[-4:] if item.get("role") == "user"]
    if not ultimos_textos:
        return ""

    config = LANGUAGE_CONFIG.get(idioma, LANGUAGE_CONFIG["pt"])
    return f"{config['recent_prefix']}{ultimos_textos[-1]}. "


def montar_contexto_metricas(df: pd.DataFrame | None, idioma: str) -> str:
    config = LANGUAGE_CONFIG.get(idioma, LANGUAGE_CONFIG["pt"])
    if df is None or df.empty:
        return config["no_data"]

    investimento = float(df["investimento"].sum())
    cliques = float(df["cliques"].sum())
    conversoes = float(df["conversoes"].sum())
    ctr = float(df["ctr"].mean()) if "ctr" in df.columns else 0.0
    principal_plataforma = (
        df.groupby("plataforma")["investimento"].sum().sort_values(ascending=False).index[0]
    )
    principal_campanha = (
        df.groupby("campanha")["conversoes"].sum().sort_values(ascending=False).index[0]
    )

    return config["summary"].format(
        investimento=investimento,
        cliques=int(cliques),
        conversoes=conversoes,
        ctr=ctr,
        plataforma=principal_plataforma,
        campanha=principal_campanha,
    )


def montar_contexto_cliente(perfil: PerfilUsuario, idioma: str) -> str:
    partes: list[str] = []

    if idioma == "pt":
        if perfil.cliente_nome:
            partes.append(f"Cliente analisado: {perfil.cliente_nome}.")
        if perfil.cliente_nicho:
            partes.append(f"Nicho: {perfil.cliente_nicho}.")
        if perfil.cliente_objetivo:
            partes.append(f"Objetivo do cliente: {perfil.cliente_objetivo}.")
        if perfil.cliente_pedido:
            partes.append(f"Pedido atual do cliente: {perfil.cliente_pedido}.")
        if perfil.cliente_restricoes:
            partes.append(f"Restricoes ou cuidados: {perfil.cliente_restricoes}.")
    elif idioma == "en":
        if perfil.cliente_nome:
            partes.append(f"Client under analysis: {perfil.cliente_nome}.")
        if perfil.cliente_nicho:
            partes.append(f"Industry: {perfil.cliente_nicho}.")
        if perfil.cliente_objetivo:
            partes.append(f"Client goal: {perfil.cliente_objetivo}.")
        if perfil.cliente_pedido:
            partes.append(f"Current request from the client: {perfil.cliente_pedido}.")
        if perfil.cliente_restricoes:
            partes.append(f"Restrictions or cautions: {perfil.cliente_restricoes}.")
    elif idioma == "es":
        if perfil.cliente_nome:
            partes.append(f"Cliente analizado: {perfil.cliente_nome}.")
        if perfil.cliente_nicho:
            partes.append(f"Nicho: {perfil.cliente_nicho}.")
        if perfil.cliente_objetivo:
            partes.append(f"Objetivo del cliente: {perfil.cliente_objetivo}.")
        if perfil.cliente_pedido:
            partes.append(f"Pedido actual del cliente: {perfil.cliente_pedido}.")
        if perfil.cliente_restricoes:
            partes.append(f"Restricciones o cuidados: {perfil.cliente_restricoes}.")
    else:
        if perfil.cliente_nome:
            partes.append(f"当前分析客户：{perfil.cliente_nome}。")
        if perfil.cliente_nicho:
            partes.append(f"行业：{perfil.cliente_nicho}。")
        if perfil.cliente_objetivo:
            partes.append(f"客户目标：{perfil.cliente_objetivo}。")
        if perfil.cliente_pedido:
            partes.append(f"客户当前需求：{perfil.cliente_pedido}。")
        if perfil.cliente_restricoes:
            partes.append(f"限制或注意事项：{perfil.cliente_restricoes}。")

    return " ".join(partes).strip()


def _resposta_cliente(perfil: PerfilUsuario, idioma: str) -> str:
    contexto_cliente = montar_contexto_cliente(perfil, idioma)
    if not contexto_cliente:
        return ""

    if idioma == "pt":
        return (
            f"{contexto_cliente} Minha linha de raciocinio e: entender o pedido real do cliente, separar urgencia de prioridade, definir o que fazer agora, o que testar depois e o que evitar para nao desperdiçar verba ou reputacao. "
        )
    if idioma == "en":
        return (
            f"{contexto_cliente} My reasoning path is: understand the real client request, separate urgency from priority, define what to do now, what to test next, and what to avoid so budget and reputation are protected. "
        )
    if idioma == "es":
        return (
            f"{contexto_cliente} Mi linea de razonamiento es: entender el pedido real del cliente, separar urgencia de prioridad, definir que hacer ahora, que probar despues y que evitar para no desperdiciar presupuesto o reputacion. "
        )
    return (
        f"{contexto_cliente} 我的思路是：先理解客户真正的需求，再区分紧急与重要，明确现在该做什么、之后测试什么，以及为了避免浪费预算或损害品牌应该避免什么。 "
    )


def _resposta_small_talk(pergunta_lower: str, nome: str, idioma: str) -> str | None:
    saudacao = f"{nome}, " if nome else ""

    if idioma == "pt":
        if any(chave in pergunta_lower for chave in ["meu nome e", "me chamo", "pode me chamar de", "sou o", "sou a"]):
            if nome:
                return f"Perfeito, {nome}. Vou lembrar disso e seguir te chamando assim daqui para frente."
            return "Perfeito. Vou guardar seu nome para as proximas conversas."
        if any(chave in pergunta_lower for chave in ["como foi seu dia", "como esta seu dia", "como foi o dia"]):
            return f"{saudacao}meu dia está produtivo. Estou aqui totalmente focada em te ajudar a pensar com clareza e chegar numa resposta boa para o seu cliente."
        if any(chave in pergunta_lower for chave in ["oi", "ola", "olá", "tudo bem"]):
            if nome:
                return f"{saudacao}oi, tudo bem por aqui. O que voce quer destravar hoje? Se tiver cliente, metrica ou decisao para pensar, eu entro com voce nisso."
            return "Oi. Tudo bem por aqui. Antes de tudo, como voce prefere que eu te chame? Depois disso eu sigo com voce nas proximas conversas sem perguntar de novo."
        if any(chave in pergunta_lower for chave in ["calma", "mais devagar", "explica melhor", "detalha"]):
            return f"{saudacao}claro. Vou desacelerar e explicar em partes, de um jeito mais direto e detalhado."
    if idioma == "en":
        if any(chave in pergunta_lower for chave in ["how was your day", "how is your day"]):
            return f"{saudacao}my day is going well. I am fully focused on helping you think clearly and build a strong response for your client."
        if any(chave in pergunta_lower for chave in ["hi", "hello", "how are you"]):
            return f"{saudacao}hi, I am doing well. Tell me about the client case and I will help you shape the best response and action plan."
        if any(chave in pergunta_lower for chave in ["slow down", "explain better", "be calm", "more detail"]):
            return f"{saudacao}of course. I will slow down and explain it step by step in a clearer way."
    if idioma == "es":
        if any(chave in pergunta_lower for chave in ["como fue tu dia", "como esta tu dia"]):
            return f"{saudacao}mi dia va bien. Estoy totalmente enfocada en ayudarte a pensar con claridad y construir una buena respuesta para tu cliente."
        if any(chave in pergunta_lower for chave in ["hola", "que tal", "como estas"]):
            return f"{saudacao}hola, todo bien por aqui. Cuentame el caso del cliente y te ayudo a definir la mejor respuesta y accion."
        if any(chave in pergunta_lower for chave in ["calma", "mas despacio", "explica mejor", "detalla"]):
            return f"{saudacao}claro. Voy a bajar el ritmo y explicar todo paso a paso y con mas detalle."
    if any(chave in pergunta_lower for chave in ["你好", "最近怎么样", "慢一点", "详细解释"]):
        return f"{saudacao}当然可以。我会放慢节奏，用更清楚、更细的方式来解释。"
    return None


def gerar_resposta_marketing(
    pergunta: str,
    perfil: PerfilUsuario,
    df: pd.DataFrame | None,
    historico: Iterable[dict[str, str]],
) -> str:
    pergunta_lower = pergunta.lower().strip()
    idioma = detectar_idioma(pergunta)
    intencao = classificar_intencao(pergunta, idioma)
    config = LANGUAGE_CONFIG.get(idioma, LANGUAGE_CONFIG["pt"])
    contexto = montar_contexto_metricas(df, idioma)
    contexto_cliente = _resposta_cliente(perfil, idioma)
    saudacao = f"{perfil.nome}, " if perfil.nome else ""
    abertura, fechamento = _ajuste_de_tom(perfil.tom, idioma)
    memoria_curta = _ultima_interacao(historico, idioma)

    if intencao == "small_talk":
        small_talk = _resposta_small_talk(pergunta_lower, perfil.nome, idioma)
        if small_talk:
            return small_talk

    if idioma == "pt" and intencao == "client_case":
        return (
            f"{saudacao}{abertura} {contexto_cliente}Eu li esse caso assim: existe um pedido, uma expectativa por tras dele e um risco de executar no impulso. O que eu faria agora e separar o que e urgente, o que realmente move resultado e o que precisa ser alinhado antes de prometer qualquer coisa. O que eu evitaria e responder no automatico, sem checar meta, prazo, verba e impacto na operacao. Se quiser, eu posso te devolver isso em formato de resposta pronta para voce usar com o cliente. {fechamento}"
        )

    if intencao == "ctr":
        return f"{saudacao}{abertura} {contexto_cliente}{config['ctr'].format(contexto=contexto, memoria=memoria_curta, fechamento=fechamento)}"

    if intencao == "conversion":
        return f"{saudacao}{abertura} {contexto_cliente}{config['conversion'].format(contexto=contexto, memoria=memoria_curta, fechamento=fechamento)}"

    if intencao == "platform":
        return f"{saudacao}{abertura} {contexto_cliente}{config['platform'].format(contexto=contexto, memoria=memoria_curta, fechamento=fechamento)}"

    if intencao == "next_step":
        return f"{saudacao}{abertura} {contexto_cliente}{config['next_step'].format(contexto=contexto, memoria=memoria_curta, fechamento=fechamento)}"

    if intencao == "general_chat" and not eh_tema_marketing(pergunta_lower):
        objetivo = perfil.objetivo.strip()
        contexto_objetivo = f"Estou considerando que o seu foco e {objetivo}. " if objetivo else ""
        contexto_cliente_curto = "" if not perfil.cliente_nome else f"Se isso estiver ligado a {perfil.cliente_nome}, eu ja levo esse contexto junto. "
        return (
            f"{saudacao}{abertura} {contexto_objetivo}{contexto_cliente_curto}{memoria_curta}Eu consigo conversar com voce de forma simples, entender o que voce realmente precisa e ir ajustando o raciocinio junto com voce. Nao precisa vir com tudo estruturado. Pode me falar do seu jeito que eu organizo com voce e, quando fizer sentido, eu puxo para acao, metrica ou resposta para cliente. {fechamento}"
        )

    return f"{saudacao}{abertura} {contexto_cliente}{config['default'].format(contexto=contexto, memoria=memoria_curta, fechamento=fechamento)}"

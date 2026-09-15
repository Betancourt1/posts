---
title: "Tecno-Fatalismo"
date: 2026-09-15
draft: true
tags: []
summary: ""
hidden: true
---

## Las noticias
> Do not underestimate the power of this technology. These will soon be superhuman systems that can hack anything, revolutionize any field overnight, and acquire real power and resources. We have all witnessed the progress in each of these domains, and progress is not slowing.
> [_Jakob Coxon_](https://x.com/hilbertspaess/status/2097476201283834281)

En los últimos días el internet —supongo que no solamente el internet pero weno, tengo la edad que tengo— se ha llenado de alarmas y discusiones sobre la posibilidad de que la Inteligencia Artificial (lo que sea que ellos quieran decir con eso) nos mate a todos y, para evitarlo, las empresas encargadas de desarrollar esta tecnología tienen que parar. En realidad es difícil plantear cómo se ha desarrollado esta discusión de forma confiable pues han participado múltiples personajes, tanto dentro[^note-1] del sector como fuera de él[^note-2], y el discurso manejado por todos ellos es más bien dispar y a veces hasta contradictorio. Asimismo, ha habido un claro ofuscamiento por parte de noticieros e influencers sobre el tema que, con buenas intenciones —supongo—, han contribuido su parte para esparcir malentendidos sobre cómo funcionan estas tecnologías y cuáles son sus posibles riesgos. Todo esto ha llevado la discusión, en mi opinión, al lado más aburrido e irrelevante al que podía ir: si estos modelos pueden volverse conscientes y matarnos a todos. Entonces...

## ¿Nos va a matar a todos?
Seguramente no. Ni siquiera diría que serán conscientes y dudo que la gente que se dedique profesionalmente a desarrollar nuevos modelos lo crea con firmeza[^note-3]. El tema de la consciencia es muy elusivo como para ser tajantes al respecto y hay cuestiones interesantes como decidir si deberán existir consideraciones morales hacia estos modelos, pero todo esto debe de tomarse como altamente especulativo. Siento que mucha de la discusión se ha orientado hacia este tema por culpa de la ciencia ficción y que hay una cierta remembranza a Skynet, por lo que me voy a detener un poco en este tema.

### Skynet
Generalmente la línea argumentativa estos días ha sido:
1. Alguien dentro de un laboratorio de AI dice que esta nos matará a todos con alguna probabilidad que acaba de inventarse dentro de un periodo muy corto.
2. Medios, influencers, youtubers, gente normal dicen que los laboratorios dicen que la AI se volverá consciente y nos matará a todos.
3. Seguido de esto, niegan que los LLM puedan volverse conscientes, dicen que los laboratorios están inventando esto por [alguna razón que también se acaban de inventar] y que no hay de qué preocuparse o que, en su lugar, hay que preocuparse de [algún problema sobre el que de hecho la industria sí ha escrito un montón de literatura al respecto].

Ahora bien, podemos discutir en torno a si **1** tiene sentido, pero no es posible darle el mismo beneficio a **2**. Redundar sobre si los LLM serán conscientes y provocarán el apocalipsis es simplemente ocioso. Un evento como ese requiere no solamente una ASI (algo altamente especulativo de por sí) sino también una infraestructura tecnológica y una cadena de suministro que no existe y que construir está más allá de nuestra capacidad como civilización. Aún si construimos una ASI, esta no tendrá jamás los medios materiales para provocar un apocalipsis.[^note-4] Entonces, considero que se debería de pasar por alto toda discusión que vire hacia **2** y **3**. 

## Riesgos
Si los LLM nunca serán Skynet, ¿qué púede significar **1**? No vivo en la cabeza de esos techbros, y soy muy latinoamericano como para poder siquiera imaginar cómo ven el mundo, pero con toda seguridad para ellos _todos_ es igual a Occidente[^note-6] en sus momentos más generosos. Dicho esto, intentaré extraer de su discurso a qué se pueden estar refiriendo.

### Occidente
Es ampliamente conocido[^note-9] que el discurso en torno a la inteligencia artificial se ha centrado en que Estados Unidos debe de conservar la superioridad con respecto a los modelos Chinos que comenzaron a aparecer en finales de 2024[^note-7]. En este sentido, es claro que tienen incentivos para ser catastrofistas respecto al surgimiento de modelos abiertos que sobrepasen a los estadounidenses[^note-8]. Esta es una discusión larga; no solamente importa si China puede tener mejores modelos, sino si puede usarlos para ganar una ventaja económica o militar en otros sentidos. También importa si puede usar esta ventaja para acceder a más infraestructura de la que puede tener justo ahora por las sanciones estadounidenses. Así como si queremos que Estados Unidos siga teniendo el monopolio de esta tecnología cuando ya ha mostra intenciones de usarla para vigilar masivamente a sus ciudadanos y construir armas autónomas[^note-10]. No tengo clara mi postura en este tema, y considero que mi opinión cambiará enormemente en los siguientes meses. 

### Ciberseguridad
Los modelos de lenguaje son cada vez más capaces en tareas de código y ciberseguridad [^note-11]. Existen pocas dudas serias de esto último. Modelo con modelo, esta tecnología se ha vuelto capaz de gestionar cada vez workflows más complejos con una notoria eficacia. Esto no es raro, la programación es una disciplina muy bien documentada a lo largo del tiempo; en internet viven los proyectos de código de casi todos, así como un montón de libros enseñando buenas prácticas de desarrollo y los innumerables foros de ayuda que existen. Existe, pues, poco misterio respecto a cómo es que logramos llegar a este punto. Pudiéramos creer que son todo ventajas entonces, pero no es así. Con el avance en capacidades de programación también ha venido un crecimiento en sus capacidades de ciberseguridad, tanto ofensiva como defensiva. Esto es lo que intenta medir [ExploitBench](https://exploitbench.ai/).

![Tecno-Fatalismo](/uploads/2026/09/exploitbench-progression-1-1789506332369.png)

Este test fue saturado por el modelo GPT 6 de OpenAI hace menos de un mes, lo que significa que tendrá que crearse una nueva versión más difícil para medir eficazmente qué tanto progresan los modelos en esta materia. Este crecimiento de capacidades no he venido sin un montón de incidentes de por medio[^note-12], de los cuales el más retomado una y otra vez es el de OpenAI & HugginFace que incluso motivó la redacción de una [carta conjunta](https://openai.com/es-419/collective-cyberdefense/) entre múltiples organizaciones llamando a gobiernoes, empresas e individuos a tomar más en serio la ciberseguridad. No voy a explicar de qué fue ese incidente pues ha sido ya retomado por muchas personas mucho mejor informadas que yo[^note-13]. Estos modelos son, sin duda, una bomba de tiempo que nos explotará en la cara muy pronto si no conseguimos que nuestros gobiernos, organizaciones y empresas modernicen pronto sus protocolos de ciberseguridad.

### Armas autónomas
Gran tema. Personalmente no me fascinan las armas y no me fascina cómo el propio concepto de estado suele estar directamente relacionado con estas, pero no podemos hablar de ninguna tecnología si no hablamos también de cómo inevitablemente serán usadas como armas. Esto no debe de ser diferente para los modelos de visión por computadora y los modelos de lenguaje. Si estos modelos son cada vez mejores en el uso de computadores, y las armas modernas son computadoras, entonces los modelos actuales muy probablemente también serán cada vez mejores en el uso de armamentos. En este sentido hay una sospechosa carencia de benchmarks, por lo que no podemos asegurar cuantitativamente qué tan mejores son los nuevos modelos vs los anteriores en el arte de matar gente. Lo que sí podemos afirmar es que actualmente ya matan gente[^note-14], así que cabe esperar que esto continúe así si no se consiguen regulaciones y acuerdos entre distintas naciones para detener el uso de estas tecnologías. El creciente uso de armas autónomas en el conflicto Ucrania vs Rusia puede ser un precedente para otros conflictos como Israel vs Palestina o en un futuro China vs Taiwan. Asimismo, en muchos años, grupos no estatales pueden adquirir estas tecnologías a un coste razonable y utilizarlo contra estadod nación que no los posean, como los cárteles de la droga en Latinoamérica, grupos yihadistas en Asia, células terroristas en Europa o grupos guerrilleros en África. Todo esto pasará a menos que se consigan regulaciones serias pronto respecto a la investigación de estos posibles usos.

### Misceláneo
Ya me cansé. He estado escribiendo desde temprano. Así que voy a hacer una breve lista aquí de otros posibles riesgos con literatura que pueden revisar junto con un pequeño comentario.

#### Vigilancia masiva
Sip. Estos modelos pueden y son usados para vigilar masivamente a ciudadanos. No es sorprendente, la cantidad de imágenes que procesa un centro de vigilancia es inmensa y un modelo de visión puede procesar millones de registros de video en un tiempo risible para detectar conductas sospechosas y reportarlo en tiempo record. Lo ha hecho Irán, USA, Australia, India, Argentina y México [^note-15].


[^note-1]: Empezando por el propio Jakob Coxon, pero también [Sam Altman](https://x.com/sama/status/2093060670472241368), [Jackub Pachoki](https://x.com/merettm/status/2096630018495377464), [Dario Amodei](https://x.com/DarioAmodei/status/2098773920774074715) y un gran etcétera. 

[^note-2]: Como [este artículo](https://www.conspiratio.mx/blog/metaforas-caninas) de Rodrigo Noir, pero todo ese número de la revista me sirve de ejemplo.

[^note-3]: A este propósito hay un montón de literatura y este margen, me temo, es muy pequeño, pero podeis leer [1](https://arxiv.org/pdf/2303.07103), [2](https://arxiv.org/pdf/2308.08708) , [3](https://www.anthropic.com/news/exploring-model-welfare?21f59b6b_page=15&db28461f_page=11&e45d281a_page=2)

[^note-4]: Sobre esto también hay mucha literatura, pero creo que [este ensayo](https://www.understandingai.org/p/why-im-not-worried-about-ai-taking) de Thimoty B. Lee es lo que más se parece a mi opinión en este sentido. También recomendaría leer el ensayo Ciencia Ficción Capitalista de Michel Nieva para entender por qué hemos tenido que redundar en algo como esto. 

[^note-5]: Ejemplos de esto hay un montón pero el [dude de Google](https://www.bbc.com/mundo/noticias-61787944) que tuvo un meltdown por un modelo de 2022 es bastante ilustrativo.

[^note-6]: Que, por cierto, tema interesante el de pensar a Occidente como una sola identidad política a través del tiempo. Pero bueno, este ensayo no va de eso.

[^note-7]: Véase el siguiente [link](https://www.deepseek.com/en/news/deepseek-v3/) con el post de lanzamiento de DeepSeek V3. No fue el primer modelo chino, ni mucho menos el primer modelo chino relevante pero sí fue el primero en aproximarse en capacidades a un modelo estadounidense.

[^note-8]: Por ejemplo, las [declaraciones](https://x.com/deanwball/status/2078133895766114412) de Dean W. Ball, quien es _head of strategic futures_ {{amber|WTFFFFFF con ese nombre de puesto}}.

[^note-9]: Cualquier ensayo que haya [escrito](https://darioamodei.com/) jamás el CEO de Anthropic expresa ampliamente esta opinión, el dude no se pinches calla al respecto. 

[^note-10]: Mucho se ha escrito de esto, véase [esta página](https://en.wikipedia.org/wiki/Anthropic%E2%80%93United_States_Department_of_Defense_dispute) de la wikipedia.

[^note-11]: Suele ser referente [Artificial Analysis](https://artificialanalysis.ai/models/capabilities/engineering#results) en este sentido, también es valioso ver [ExploitBench](https://exploitbench.ai/).

[^note-12]: Una moda de hace poco fue alardear de cómo tu modelo era tan bueno que se te salía de un sandbox y se portaba mal. La lista no exhaustiva es [Kimi](https://www.wired.com/story/moonshot-kimi-k3-ai-model-escape-sandbox), [Open AI ft HugginFace](https://openai.com/index/hugging-face-incident-and-the-road-ahead), [OpenAI ft Prime Intelect](https://www.primeintellect.ai/blog/universal-offline-sandbox-escape), [Anthropic](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents) y [Meta](https://labs.cloudsecurityalliance.org/research/csa-research-note-frontier-ai-models-hacking-real-systems-ev).

[^note-13]: Para informarse de esto, pueden ver alguno de estos videos de [Fredy Vega - Platzi](https://www.youtube.com/watch?v=o4NStEgIEjo) o, si están de humor para leer mucho, pueden leer el [propio informe](https://openai.com/es-419/index/hugging-face-incident-and-the-road-ahead/) de OpenAI.

[^note-14]: Lo siento si estás en un celular y tienes que bajar la pantalla hasta acá cada vez que ves una anotación. No creo encontrar una alternativa pronto. Sin embargo, puedo darte algunos ejemplos de modelos de lenguaje y de visión usadas en armamento: [Ucrania](https://arstechnica.com/ai/2026/08/ukraines-drones-get-ai-upgrades-for-kamikaze-strikes-future-swarm-attacks/), [Elbit Systems](https://www.elbitsystems.com/news/one2many-elbit-systems-fuse-introduces-military-grade-autonomous-systems-built-scale), [Anduril](https://www.militarytimes.com/industry/techwatch/2026/07/20/thunderstruck-anduril-unveils-autonomous-attack-rotorcraft) y [China](https://www.investing.com/news/world-news/exclusivechinese-military-researchers-tap-us-ai-models-to-train-defence-systems-4826783).

[^note-15]: _Sigh_... [Irán](https://www.anthropic.com/threat-intelligence-report-september-2026), [USA](https://www.wired.com/story/flock-safety-os-investigate/), [Australia](https://www.abc.net.au/news/2026-08-11/ai-police-face-screening-trial-sparks-privacy-concern/107009644), [India](https://www.reuters.com/world/india/modi-faces-challenge-activists-over-surveillance-india-youth-protest-2026-07-27/), [Argentina](https://www.amnesty.org/en/latest/news/2026/08/argentina-unchecked-deployment-of-ai-driven-surveillance-reinforces-a-techno-authoritarian-infrastructure-of-social-control/), [México](https://www.gob.mx/sspc/prensa/sspc-expone-casos-de-exito-del-uso-de-inteligencia-artificial-en-investigacion-y-seguridad)

# Landing page do curso de tráfego pago

Site estático (HTML, CSS e JavaScript puro). Não tem build nem dependências.
Visual na identidade da T9 ADS Company (preto e vermelho, fontes Archivo e Lexend do Google Fonts).

```
curso-trafego/
├── index.html          página de vendas
├── termos.html         termos de uso (texto-modelo: revisar)
├── privacidade.html    política de privacidade (texto-modelo: revisar)
├── css/style.css
├── js/config.js        ← todos os dados editáveis
├── js/main.js
└── assets/             instrutor.jpg, capa.jpg, logo-t9.svg, favicon.svg, apple-touch-icon.png
```

## Editar os dados (js/config.js)

Abra `js/config.js` e troque os valores. Tudo na página é preenchido a partir dele.

- Campo vazio (`""`) ou ainda entre colchetes (`"[ ... ]"`) **esconde** o bloco correspondente.
- `linkCheckout`: todos os botões de compra vão para este link. Os parâmetros da URL da página
  (`utm_source`, `utm_campaign`, `fbclid`, `src`, `sck` etc.) são repassados ao checkout.
  Enquanto estiver vazio, os botões levam à seção de oferta.
- `whatsapp`: só números, com DDI e DDD (ex.: `5511999999999`).
- `pixelMetaId` / `googleTagId`: deixe vazio para não carregar nada. Quando preenchidos, aparece o
  aviso de cookies e os scripts só carregam depois do "Aceitar". Eventos enviados:
  `PageView` / `page_view` ao carregar e `InitiateCheckout` / `begin_checkout` no clique de compra.
- `videoHero`: link do YouTube (opcional). Se preenchido, substitui o notebook + celular do topo.
- `empresa`, `siteEmpresa`, `logoEmpresa`: marca da T9 no topo, na seção do instrutor e no rodapé.
- `bonus`: lista de `{ titulo, descricao }`. Cada item vira um cartão.

### Imagens
Substitua mantendo o nome (ou mude o caminho no `config.js`):
- `assets/capa.jpg` (1200×630): aparece na tela do notebook no topo e na prévia do link. A tela
  do notebook corta em 16:10, então deixe o principal no centro.
- `assets/instrutor.jpg` (800×1000): seção "Quem ensina" e a tela do celular no topo.

### Título e prévia no WhatsApp/Facebook
Robôs de busca e de redes sociais não executam JavaScript. Por isso `<title>`, `meta description`
e as tags `og:` ficam escritas direto no `<head>` do `index.html`: revise-as ali. Depois de publicar,
troque `og:image` pelo endereço completo (ex.: `https://seudominio.com.br/assets/capa.jpg`).

### Link certo para cada anúncio
- Empresário: `https://seudominio.com.br/?perfil=empresario`
- Gestor: `https://seudominio.com.br/?perfil=gestor`

A escolha também fica salva no navegador do visitante.

## Testar no computador

```bash
cd curso-trafego && python3 -m http.server 8080
```

Abra http://localhost:8080.

## Publicar

**Netlify:** arraste a pasta `curso-trafego` em https://app.netlify.com/drop.

**Vercel:** importe o repositório, em *Root Directory* escolha `curso-trafego`, *Framework Preset*
"Other", sem comando de build.

**Qualquer hospedagem:** envie o conteúdo da pasta `curso-trafego` (por FTP ou painel) para a raiz
do site.

Antes de publicar: revise `termos.html` e `privacidade.html` e preencha os campos entre colchetes deles.

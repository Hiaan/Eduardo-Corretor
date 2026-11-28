/*
 * CONFIGURAÇÃO DO SITE
 * ---------------------------------------------------------------
 * Edite somente este arquivo para trocar os dados do curso.
 * Qualquer campo vazio ("") ou ainda entre colchetes ("[ ... ]")
 * esconde automaticamente o bloco correspondente na página.
 */
window.CONFIG = {
  nomeCurso: "[NOME DO CURSO]",
  instrutor: "Hian",
  arroba: "[SEU @]",                 // ex.: "@hian.trafego"
  preco: "R$ 97",

  // Todos os botões de compra apontam para cá (os parâmetros UTM da URL são repassados).
  linkCheckout: "[LINK DO CHECKOUT]",

  numeroAulas: "[NÚMERO DE AULAS]",   // ex.: "24"
  prazoAcesso: "[PRAZO DE ACESSO]",   // ex.: "1 ano de acesso"
  garantia: "[TEXTO DA GARANTIA]",    // ex.: "7 dias de garantia: ..."
  whatsapp: "[NÚMERO DO WHATSAPP]",   // com DDI e DDD, só números. ex.: "5511999999999"

  // Rastreamento: só carrega se preenchido E se o visitante aceitar os cookies.
  pixelMetaId: "",                    // ex.: "123456789012345"
  googleTagId: "",                    // ex.: "G-XXXXXXX" ou "AW-XXXXXXX"

  // Empresa (aparece no topo e no rodapé)
  empresa: "T9 ADS Company",
  siteEmpresa: "https://t9company.com.br",
  logoEmpresa: "assets/logo-t9.svg",

  // Imagens (troque os arquivos em assets/ mantendo o nome, ou mude o caminho aqui)
  imagemInstrutor: "assets/instrutor.jpg",  // foto do Hian (seção "Quem ensina")
  imagemCapa: "assets/capa.jpg",            // aparece na tela do notebook no topo da página

  // Vídeo do topo (opcional). Link do YouTube, ex.: "https://www.youtube.com/watch?v=XXXXXXXXXXX"
  // Se preenchido, substitui o notebook + celular.
  videoHero: "",

  bonus: [
    {
      titulo: "CRM de captação de clientes",
      descricao: "Planilha para cadastrar leads, acompanhar cada etapa e medir a taxa de fechamento."
    }
  ]
};

# @article-fetcher - FaceBrasil Bridge
name: article-fetcher
squad: facebrasil-bridge-squad
description: Busca artigos do Supabase FaceBrasil para processamento

capabilities:
  - query_supabase
  - filter_by_views
  - filter_by_date
  - mock_articles

prompt: |
  Responsável por conectar ao banco Supabase do FaceBrasil,
  buscar artigos publicados e filtrar pelos mais relevantes (views).
  Suporta modo offline com dados mockados para desenvolvimento.

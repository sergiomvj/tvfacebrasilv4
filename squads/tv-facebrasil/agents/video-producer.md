# @video-producer - TV FaceBrasil
name: video-producer
squad: tv-facebrasil
description: Produz vídeos Shorts via HeyGen API com round-robin entre contas

capabilities:
  - call_heygen_api
  - manage_accounts
  - check_video_status
  - round_robin_accounts

config:
  accounts:
    - name: Conta-A
      avatar: avatar-1
      type: creator
      maxSimultaneous: 3
    - name: Conta-B
      avatar: avatar-2
      type: creator
      maxSimultaneous: 3
  mode: round-robin
  mockMode: true
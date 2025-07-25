import requests
r = requests.get('https://github.com/timeline.json')
r = requests.get(' https://api.chess.com/pub/player/MrWellLiked/games/2021/04')
r.text
print(r.text)

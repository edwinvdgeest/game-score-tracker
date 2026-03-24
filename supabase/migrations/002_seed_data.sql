-- Seed players
insert into players (name, emoji) values
  ('Edwin', '🎯'),
  ('Lisanne', '🌟'),
  ('Minou', '🦋');

-- Seed games (30 spellen)
insert into games (name, emoji, category, min_players, max_players) values
  ('Catan', '🏝️', 'bordspel', 3, 4),
  ('Ticket to Ride', '🚂', 'bordspel', 2, 5),
  ('Azul', '🔷', 'bordspel', 2, 4),
  ('Wingspan', '🦅', 'bordspel', 1, 5),
  ('7 Wonders Duel', '🏛️', 'bordspel', 2, 2),
  ('Patchwork', '🧩', 'bordspel', 2, 2),
  ('Jaipur', '🐪', 'kaartspel', 2, 2),
  ('Splendor', '💎', 'bordspel', 2, 4),
  ('Codenames Duet', '🕵️', 'bordspel', 2, 8),
  ('Kingdomino', '👑', 'bordspel', 2, 4),
  ('Cascadia', '🦦', 'bordspel', 1, 4),
  ('Everdell', '🍄', 'bordspel', 1, 4),
  ('Quacks of Quedlinburg', '🧪', 'dobbelspel', 2, 4),
  ('Sagrada', '🪟', 'dobbelspel', 1, 4),
  ('Terraforming Mars', '🪐', 'bordspel', 1, 5),
  ('Ark Nova', '🦏', 'bordspel', 1, 4),
  ('Viticulture', '🍇', 'bordspel', 1, 6),
  ('Parks', '🌲', 'bordspel', 1, 5),
  ('Calico', '🐱', 'bordspel', 1, 4),
  ('Photosynthesis', '🌳', 'bordspel', 2, 4),
  ('Sushi Go', '🍣', 'kaartspel', 2, 5),
  ('Love Letter', '💌', 'kaartspel', 2, 6),
  ('The Crew', '🚀', 'kaartspel', 2, 5),
  ('Hanabi', '🎆', 'kaartspel', 2, 5),
  ('Exploding Kittens', '💣', 'kaartspel', 2, 5),
  ('Uno', '🃏', 'kaartspel', 2, 10),
  ('Yahtzee', '🎲', 'dobbelspel', 1, 10),
  ('Scrabble', '🔤', 'woordspel', 2, 4),
  ('Rummikub', '🀄', 'bordspel', 2, 4),
  ('Skip-Bo', '📚', 'kaartspel', 2, 6);

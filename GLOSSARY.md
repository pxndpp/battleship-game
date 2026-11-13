# Battleship

A two-player online Battleship game played between friends through a shared room link.

## Session

**Room**:
A space that exactly two Players join via a shared link and play one or more games in; it closes when a Player leaves.
_Avoid_: Lobby, match, session

**Rematch**:
A new game in the same Room, started when both Players agree after a Win; the Player who fired first last game fires second.
_Avoid_: Replay, restart

**Forfeit**:
Losing because a Player left the Room mid-game or stayed disconnected for more than 5 minutes; the opponent gets the Win.
_Avoid_: Abandon, quit

**Player**:
A person in a Room, identified only by a nickname they choose on entry.
_Avoid_: User, account

## Board

**Grid**:
A Player's 10×10 field of cells, hidden from the opponent.
_Avoid_: Map, field

**Fleet**:
The fixed set of five Ships each Player places: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
_Avoid_: Navy, units

**Ship**:
A straight horizontal or vertical run of cells on a Grid; Ships may touch but never overlap.
_Avoid_: Boat, piece

**Placement**:
The phase where each Player positions their whole Fleet before any Shot is fired.
_Avoid_: Setup, deploy

## Play

**Turn**:
One Player's right to fire exactly one Shot; Turns alternate regardless of the result.

**Shot**:
One fire at a single cell of the opponent's Grid.
_Avoid_: Attack, guess, move

**Hit**:
A Shot result meaning a Ship occupies that cell; it does not reveal which Ship.

**Miss**:
A Shot result meaning no Ship occupies that cell.

**Sunk**:
The state of a Ship once every one of its cells is Hit; the sinking Ship's name is announced.

**Win**:
The outcome for the Player who sinks the opponent's entire Fleet first.

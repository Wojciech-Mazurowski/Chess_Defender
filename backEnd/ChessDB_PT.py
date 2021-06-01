from datetime import date
import mysql.connector


class ChessDB:

    def __init__(self):
       # self.mydb = mysql.connector.connect(host="localhost", user="root", password="Pudzian123", database="ChessDB1")
        self.mydb = mysql.connector.connect(host=" ec2-3-143-148-217.us-east-2.compute.amazonaws.com", user="Admin",
                                             password="",
                                            database="ChessDB")

    def create_db(self):
        mycursor = self.mydb.cursor()

        mycursor.execute('''create table if not exists Games
                             (GameID integer primary key AUTO_INCREMENT, 
                             win_type varchar(100), 
                             played DATE);''')

        mycursor.execute('''create table if not exists Users
                            (userID integer primary key AUTO_INCREMENT,
                            Username varchar(64) unique not null, 
                            Password varchar(64) not null, 
                            Country varchar(64), 
                            Joined DATE not null,
                            ELO int not null);''')

        mycursor.execute('''CREATE table if not exists Participants
                            (ParticipantID integer primary key AUTO_INCREMENT, 
                            GameID INTEGER  not null,
                            UserID Integer not null,
                            Foreign key (GameID) references  Games(GameID) on delete cascade,
                            Foreign key (UserID) references  Users(UserID) on delete cascade, 
                            Score decimal not null, 
                            Color varchar(32) not null,
                            currELO int not null);''')

        mycursor.execute('''create table if not exists Moves
                            (MoveID integer primary key AUTO_INCREMENT,
                            GameID INTEGER  not null,
                            ParticipantID INTEGER  not null,
                            Foreign key (GameID) references  Games(GameID) on delete cascade,
                            Foreign key (ParticipantID) references Participants(ParticipantID) on delete cascade, 
                            move_order integer not null, 
                            Move varchar(100) not null);''')

        mycursor.close()

    def get_curr_date(self):
        mycursor = self.mydb.cursor()
        date = "SELECT CURDATE() AS Today"
        mycursor.execute(date)

        return mycursor.fetchone()[0]

    def add_user(self, Username, Password, Country, Elo):
        mycursor = self.mydb.cursor()

        sql_user = ("INSERT INTO Users "
                    "(Username, Password, Country, Joined, ELO) "
                    "VALUES (%s, %s, %s, %s, %s)")

        date = self.get_curr_date()
        data_user = (Username, Password, Country, date, Elo)
        mycursor.execute(sql_user, data_user)
        self.mydb.commit()
        mycursor.close()

    # gdzie moves to lista list gdzie move = (Color, move_order, move)
    def add_game(self, w_id, w_score, b_id, b_score, win_type, moves):
        mycursor = self.mydb.cursor()

        sql_game = ("INSERT INTO Games "
                    "(win_type, played) "
                    "VALUES (%s, %s)")

        date = self.get_curr_date()
        data_game = (win_type, date)
        mycursor.execute(sql_game, data_game)
        game_id = mycursor.lastrowid

        sql_participant = ("INSERT INTO Participants"
                           "(GameID, UserID, Score, Color, currELO)"
                           "VALUES(%s, %s, %s, %s, %s)")

        white_user = self.get_user_by_id(w_id)
        black_user = self.get_user_by_id(b_id)

        data_participant = (game_id, white_user[0], w_score, "White", white_user[5])
        mycursor.execute(sql_participant, data_participant)
        data_participant = (game_id, black_user[0], b_score, "Black", black_user[5])
        mycursor.execute(sql_participant, data_participant)

        sql_move = ("INSERT INTO Moves"
                    "(GameID, ParticipantID, move_order, Move)"
                    "VALUES (%s, %s, %s, %s)")
        for move in moves:
            data_move = (game_id, self.get_participant(move[0], game_id)[0], move[1], move[2])
            mycursor.execute(sql_move, data_move)
        self.mydb.commit()
        mycursor.close()
        return game_id

    def update_elo(self, new_elo, Username):
        mycursor = self.mydb.cursor()

        sql_update = ("""UPDATE Users SET ELO = %s WHERE UserID = %s""")

        data_update = (new_elo, self.get_user(Username)[0])
        mycursor.execute(sql_update, data_update)
        self.mydb.commit()
        mycursor.close()

    def update_password(self, new_password, Username):
        mycursor = self.mydb.cursor()

        sql_update = ("""UPDATE Users SET Password = %s WHERE UserID = %s""")

        data_update = (new_password, self.get_user(Username)[0])
        mycursor.execute(sql_update, data_update)
        self.mydb.commit()
        mycursor.close()

    def get_user(self, Username):
        mycursor = self.mydb.cursor()

        sql_find = ("SELECT * FROM Users WHERE Users.Username = %s")

        data_find = (Username,)
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def get_user_by_id(self, userId):
        mycursor = self.mydb.cursor()

        sql_find = ("SELECT * FROM Users WHERE Users.userID = %s")

        data_find = (userId,)
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def get_participant(self, Color, GameID):
        mycursor = self.mydb.cursor()

        sql_find = ("""SELECT t1.*, Users.Username FROM (SELECT * FROM Participants WHERE Color = %s AND GameID = %s)t1, Users
                               WHERE t1.UserID = Users.UserID""")

        data_find = (Color, GameID)
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def get_moves(self, GameID):
        mycursor = self.mydb.cursor()

        sql_find = ("SELECT * FROM Moves WHERE GameID = %s;")

        data_find = GameID
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchall()
        mycursor.close()
        return result

    def get_games(self, Username1, Username2):
        mycursor = self.mydb.cursor()

        sql_find = ("""SELECT t1.* FROM (SELECT Games.*,participants.UserID FROM Games,participants
                       WHERE Participants.UserID = %s AND Games.GameID = participants.GameID)t1
                       INNER JOIN (SELECT Games.*,participants.UserID FROM Games,Participants
                       WHERE Participants.UserID = %s  AND Games.GameID = participants.GameID)t2
                       ON (t1.GameID = t2.GameID);""")

        data_find = (self.get_user(Username1)[0], self.get_user(Username2)[0])
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchall()
        mycursor.close()
        return result

    def get_games(self, UserID):
        mycursor = self.mydb.cursor()

        sql_find = ("""SELECT Games.* FROM Games, Participants
                       WHERE Participants.UserID = %s AND Games.GameID = participants.GameID""")
        
        data_find = (UserID,)
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchall()
        mycursor.close()
        return result

    def get_EloHistory(self, Username):
        mycursor = self.mydb.cursor()

        sql_find = ("""SELECT Games.played, Participants.currELO FROM Games,Participants
                       WHERE Participants.UserID = %s AND Particpants.GameID = Games.GameID""")

        data_find = (self.get_user(Username)[0],)
        mycursor.execute(sql_find, data_find)
        result = mycursor.fetchall()
        mycursor.close()
        return result

    def count_games(self, Username):
        mycursor = self.mydb.cursor()

        sql_count = (
            "SELECT COUNT(Games.GameID) FROM Games, Participants WHERE UserID = %s AND Games.GameID = Participants.GameID")

        data_count = (self.get_user(Username)[0],)
        mycursor.execute(sql_count, data_count)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def count_wins(self, Username):
        mycursor = self.mydb.cursor()

        sql_count = ("""SELECT COUNT(t1.GameID) FROM (SELECT Games.GameID, Score FROM Games, Participants 
                        WHERE UserID = %s AND Games.GameID = Participants.GameID)t1 
                        WHERE Score = 1;""")

        data_count = (self.get_user(Username)[0],)
        mycursor.execute(sql_count, data_count)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def count_draws(self, Username):
        mycursor = self.mydb.cursor()

        sql_count = ("""SELECT COUNT(t1.GameID) FROM (SELECT Games.GameID,Score FROM Games, Participants
                     WHERE UserID = %s AND Games.GameID = Participants.GameID)t1
                     WHERE Score = 0.5""")

        data_count = (self.get_user(Username)[0],)
        mycursor.execute(sql_count, data_count)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def count_losses(self, Username):
        mycursor = self.mydb.cursor()

        sql_count = ("""SELECT COUNT(t1.GameID) FROM (SELECT Games.GameID, Score FROM Games, Participants 
                         WHERE UserID = %s AND Games.GameID = Participants.GameID)t1
                         WHERE Score = 0""")

        data_count = (self.get_user(Username)[0],)
        mycursor.execute(sql_count, data_count)
        result = mycursor.fetchone()
        mycursor.close()
        return result

    def count_moves(self, gameID):
        mycursor = self.mydb.cursor()

        sql_count = (
            "SELECT COUNT(Moves.moveID) FROM Games, Moves WHERE Moves.GameID = %s AND Games.GameID = Moves.GameID")

        data_count = (gameID,)
        mycursor.execute(sql_count, data_count)
        result = mycursor.fetchone()
        mycursor.close()
        return result


tempDB = ChessDB()
tempDB.create_db()
# print(tempDB.count_losses("PainTrain"))

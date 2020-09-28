#setwd("/Users/bilelbanelhaq/Sites/ProPerf/")
data <- all_rankings
View(data)



segmentation <- function() {
  library(tibble)
  library(tidyr)
  library(dplyr)
  library(purrr)

  splitString <- function(str) {return((strsplit(as.character(str),":")))}
  convert <- function(time) {
    timeSecond <- as.numeric(time[[1]][1]) * 3600 + as.numeric(time[[1]][2]) * 60 + as.numeric(time[[1]][3])
    return(as.character(timeSecond))
  }
  
  # Lecture du CSV + Calcul ages au moement de la course + convertion time - sec
  data_csv <- read.csv("CPN_V2/dev-data/all_rankings_natcourse.csv",sep = ";")
  data_csv["age"] <- data_csv["season"] - data_csv["birthyear"] 
  for (k in 1:nrow(data_csv["rankingtime"])) {
    time <- strsplit(as.character(data_csv[k,"rankingtime"]),":")
    data_csv[k,"time_Seconds"] <- convert(time)
  }

  # Extrait tout les types de courses
  data_grouped <- group_by(data_csv, race)
  races <- summarise(data_grouped)

  # Parcourt les types courses
  for (raceName in 1:nrow(races["race"])) {
    print(paste(raceName,"/",nrow(races["race"]),"=>", round(raceName/nrow(races["race"])*100),"%", sep = " "))

    # Segemente par nage
    write.csv(x = filter(data_csv, race == races[[raceName,"race"]]), paste("CPN_V2/scorring/csv/By_Race/",races[[raceName,"race"]],".csv", sep = ""))

    # Segemente par sexe
    data_by_race <- read.csv(paste("CPN_V2/scorring/csv/By_Race/",races[[raceName,"race"]],".csv",sep =""),sep = ",")
    write.csv(x = filter(data_by_race, sex == "F"), paste("CPN_V2/scorring/csv/By_Sex/",races[[raceName,"race"]],"-women.csv", sep = ""))
    write.csv(x = filter(data_by_race, sex == "M"), paste("CPN_V2/scorring/csv/By_Sex/",races[[raceName,"race"]],"-men.csv", sep = ""))

    # Extrait tout les ages - femme
    data_by_sex_women <- read.csv(paste("CPN_V2/scorring/csv/By_Sex/",races[[raceName,"race"]],"-women.csv", sep = ""))
    data_grouped_byAge_women = group_by(data_by_sex_women, age)
    ages_women <- summarise(data_grouped_byAge_women)

    # Segemente par age - femme
    for (ageCSV in 1:nrow(ages_women)) {
      cluser_femme <- filter(data_by_sex_women, age == ages_women[[ageCSV,"age"]])
      
      if (nrow(cluser_femme) > 20){
        nb_cluster = 10
        obj <- kmeans(cluser_femme["time_Seconds"],nb_cluster,10000)
        print(obj)
      }
  
     
      
      write.csv(x = filter(data_by_sex_women, age == ages_women[[ageCSV,"age"]]), paste("CPN_V2/scorring/csv/By_Age/",races[[raceName,"race"]],"-women-",ages_women[[ageCSV,"age"]],".csv", sep = ""))
    }

    # Extrait tout les ages - homme
    data_by_sex_men <- read.csv(paste("CPN_V2/scorring/csv/By_Sex/",races[[raceName,"race"]],"-men.csv", sep = ""))
    data_grouped_byAge_men = group_by(data_by_sex_men, age)
    ages_men <- summarise(data_grouped_byAge_men)

    # Segemente par age - homme
    for (ageCSV in 1:nrow(ages_men)) {
      write.csv(x = filter(data_by_sex_men, age == ages_men[[ageCSV,"age"]]), paste("CPN_V2/scorring/csv/By_Age/",races[[raceName,"race"]],"-men-",ages_men[[ageCSV,"age"]],".csv", sep = ""))
    }
  }
}



segmentation()



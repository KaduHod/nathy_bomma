-- MySQL dump 10.13  Distrib 9.2.0, for Linux (x86_64)
--
-- Host: localhost    Database: agencia_conteudo
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cliente`
--

DROP TABLE IF EXISTS `cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cliente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes da agência (1 projeto por cliente por mês).';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cliente`
--

LOCK TABLES `cliente` WRITE;
/*!40000 ALTER TABLE `cliente` DISABLE KEYS */;
INSERT INTO `cliente` VALUES (1,'Studio Aurora'),(2,'Move Fitness'),(3,'Verde Cosméticos'),(4,'Padaria Trigo & Mel'),(5,'Clínica Bem Viver'),(6,'TechNova'),(7,'EducaMais'),(8,'Sabor Caseiro');
/*!40000 ALTER TABLE `cliente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `frequencia`
--

DROP TABLE IF EXISTS `frequencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `frequencia` (
  `id` int NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Frequência de entrega do projeto.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `frequencia`
--

LOCK TABLES `frequencia` WRITE;
/*!40000 ALTER TABLE `frequencia` DISABLE KEYS */;
INSERT INTO `frequencia` VALUES (2,'Semanal'),(3,'Quinzenal'),(4,'Mensal');
/*!40000 ALTER TABLE `frequencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `funcionario`
--

DROP TABLE IF EXISTS `funcionario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `funcionario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_funcionario_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Equipe. cargo funciona como vocabulário controlado.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `funcionario`
--

LOCK TABLES `funcionario` WRITE;
/*!40000 ALTER TABLE `funcionario` DISABLE KEYS */;
INSERT INTO `funcionario` VALUES (1,'Ana Ribeiro','ana.ribeiro@agencia.com','Social Media'),(2,'Bruno Costa','bruno.costa@agencia.com','Social Media'),(3,'Carla Mendes','carla.mendes@agencia.com','Social Media'),(4,'Diego Alves','diego.alves@agencia.com','Designer'),(5,'Erika Nunes','erika.nunes@agencia.com','Designer'),(6,'Felipe Ramos','felipe.ramos@agencia.com','Designer'),(7,'Gabriela Dias','gabriela.dias@agencia.com','Audiovisual');
/*!40000 ALTER TABLE `funcionario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacao`
--

DROP TABLE IF EXISTS `notificacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projeto_id` int NOT NULL,
  `funcionario_id` int NOT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `alteracao_status_id` int DEFAULT NULL COMMENT 'NULL = comentário sem mudança de status',
  `data` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_projeto` (`projeto_id`),
  KEY `idx_notif_funcionario` (`funcionario_id`),
  KEY `idx_notif_status` (`alteracao_status_id`),
  KEY `idx_notif_data` (`data`),
  CONSTRAINT `fk_notif_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_status` FOREIGN KEY (`alteracao_status_id`) REFERENCES `status` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cada mudança de status/comentário; alimenta a timeline do dashboard.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificacao`
--

LOCK TABLES `notificacao` WRITE;
/*!40000 ALTER TABLE `notificacao` DISABLE KEYS */;
INSERT INTO `notificacao` VALUES (1,1,1,'Reunião realizada, iniciando briefing.',2,'2025-07-01 09:00:00'),(2,1,1,'Briefing finalizado dentro do prazo.',4,'2025-07-07 10:00:00'),(3,1,5,'Peças criadas.',6,'2025-07-10 09:00:00'),(4,1,5,'Enviando para aprovação interna.',7,'2025-07-14 16:00:00'),(5,1,1,'Aprovado internamente. Enviando ao cliente.',8,'2025-07-15 10:00:00'),(6,1,1,'Cliente aprovou na primeira vez!',12,'2025-07-17 11:00:00'),(7,1,1,'Publicações agendadas.',14,'2025-07-28 09:00:00'),(8,5,1,'Briefing concluído.',4,'2025-07-06 10:00:00'),(9,5,5,'Iniciando artes.',6,'2025-07-07 09:00:00'),(10,5,5,'Artes prontas, enviando para revisão.',7,'2025-07-11 15:00:00'),(11,5,1,'Social aprovou. Enviando ao cliente.',8,'2025-07-12 10:00:00'),(12,5,1,'Cliente aprovou sem ressalvas.',12,'2025-07-14 09:00:00'),(13,5,1,'Publicado e finalizado.',13,'2025-07-22 10:00:00'),(14,6,1,'Briefing finalizado.',4,'2025-07-05 10:00:00'),(15,6,7,'Roteiro aprovado, iniciando gravação.',6,'2025-07-07 09:00:00'),(16,6,7,'Edição finalizada.',7,'2025-07-14 17:00:00'),(17,6,1,'Social aprovou. Enviando ao cliente.',8,'2025-07-15 10:00:00'),(18,6,1,'Cliente adorou, aprovação imediata.',12,'2025-07-16 11:00:00'),(19,6,1,'Vídeo publicado.',13,'2025-07-23 09:00:00'),(20,4,2,'Briefing alinhado com cliente.',4,'2025-07-09 10:00:00'),(21,4,5,'Artes finalizadas.',6,'2025-07-12 09:00:00'),(22,4,5,'Enviando para aprovação.',7,'2025-07-15 16:00:00'),(23,4,2,'Enviando ao cliente.',8,'2025-07-16 10:00:00'),(24,4,2,'Cliente reprovou. Quer mudar paleta de cores e trocar foto principal.',9,'2025-07-18 14:00:00'),(25,4,5,'Alterações realizadas.',7,'2025-07-20 16:00:00'),(26,4,2,'Enviando para segunda aprovação.',8,'2025-07-21 10:00:00'),(27,4,2,'Cliente reprovou novamente. Agora quer mudar a fonte e o layout.',9,'2025-07-23 15:00:00'),(28,4,5,'Segunda rodada de alterações concluída.',7,'2025-07-25 17:00:00'),(29,4,2,'Enviando para terceira aprovação.',8,'2025-07-26 10:00:00'),(30,4,2,'Cliente reprovou mais uma vez. Quer voltar à ideia original.',9,'2025-07-31 11:00:00'),(31,3,2,'Briefing finalizado no prazo.',4,'2025-07-08 10:00:00'),(32,3,7,'Produção do reels iniciada.',6,'2025-07-09 09:00:00'),(33,3,7,'Reels finalizado.',7,'2025-07-14 17:00:00'),(34,3,2,'Social aprovou. Enviando ao cliente.',8,'2025-07-15 10:00:00'),(35,3,2,'Cliente reprovou. Quer trilha sonora diferente e legendas maiores.',9,'2025-07-17 14:00:00'),(36,3,7,'Ajustes concluídos.',7,'2025-07-19 16:00:00'),(37,3,2,'Segunda aprovação enviada.',8,'2025-07-20 10:00:00'),(38,3,2,'Cliente reprovou novamente. Quer iniciar com cena diferente.',9,'2025-07-22 15:00:00'),(39,3,7,'Terceira rodada de edição finalizada.',7,'2025-07-24 17:00:00'),(40,3,2,'Enviando para aprovação final.',8,'2025-07-25 10:00:00'),(41,3,2,'Cliente aprovou na quarta versão. Agendando.',12,'2025-07-28 11:00:00'),(42,2,3,'Reunião realizada.',2,'2025-07-01 09:00:00'),(43,2,3,'Iniciando briefing.',3,'2025-07-03 11:00:00'),(44,2,3,'Briefing finalizado.',4,'2025-07-10 16:00:00'),(45,2,4,'Iniciando design.',6,'2025-07-11 09:00:00'),(46,2,4,'Carrossel finalizado com 8 slides, levou mais tempo para garantir qualidade.',7,'2025-07-23 18:00:00'),(47,2,3,'Social aprovou. Enviando ao cliente.',8,'2025-07-24 10:00:00'),(48,2,3,'Cliente aprovou sem ajustes.',12,'2025-07-26 09:00:00'),(49,2,3,'Publicado.',13,'2025-07-29 10:00:00'),(50,8,3,'Reunião agendada.',2,'2025-07-01 09:00:00'),(51,8,3,'Iniciando briefing.',3,'2025-07-08 10:00:00'),(52,8,3,'Briefing ainda em construção, cliente difícil de agendar.',3,'2025-07-15 11:00:00'),(53,8,3,'Briefing finalizado com atraso.',4,'2025-07-18 14:00:00'),(54,8,6,'Iniciando artes.',6,'2025-07-19 09:00:00'),(55,8,6,'Artes prontas.',7,'2025-07-22 16:00:00'),(56,8,3,'Social reprovou internamente. Pedindo ajuste de copy.',9,'2025-07-23 10:00:00'),(57,8,6,'Copy ajustado.',7,'2025-07-25 15:00:00'),(58,8,3,'Social reprovou novamente. Quer mudar CTA.',9,'2025-07-26 10:00:00'),(59,8,6,'CTA atualizado.',7,'2025-07-28 14:00:00'),(60,8,3,'Aprovado internamente. Enviando ao cliente.',8,'2025-07-31 09:00:00'),(61,7,3,'Reunião realizada.',2,'2025-07-01 09:00:00'),(62,7,3,'Iniciando briefing.',3,'2025-07-04 10:00:00'),(63,7,3,'Briefing finalizado com atraso. Cliente demorou para responder alinhamentos.',4,'2025-07-16 15:00:00'),(64,7,4,'Iniciando produção das peças.',6,'2025-07-17 09:00:00'),(65,7,4,'Peças finalizadas.',7,'2025-07-21 16:00:00'),(66,7,3,'Social aprovou na primeira. Enviando ao cliente.',8,'2025-07-22 10:00:00'),(67,7,3,'Cliente aprovou sem ajustes.',12,'2025-07-24 11:00:00'),(68,7,3,'Publicações agendadas e projeto finalizado.',13,'2025-07-29 09:00:00'),(69,1,1,'Briefing finalizado.',4,'2025-07-08 09:00:00'),(70,1,6,'Aguardando materiais do cliente para iniciar produção. Fotos e vídeos solicitados.',5,'2025-07-14 10:00:00'),(71,6,2,'Briefing finalizado.',4,'2025-07-09 10:00:00'),(72,6,7,'Iniciando produção do vídeo.',6,'2025-07-10 09:00:00'),(73,6,7,'Primeira versão do vídeo pronta.',7,'2025-07-18 18:00:00'),(74,6,2,'Social reprovou internamente. Narração não está alinhada ao tom da marca.',9,'2025-07-20 10:00:00'),(75,6,7,'Regravação da narração concluída.',7,'2025-07-24 16:00:00'),(76,6,2,'Enviando ao cliente.',8,'2025-07-25 10:00:00'),(77,6,2,'Cliente reprovou. Quer trilha diferente e corte mais dinâmico.',9,'2025-07-28 14:00:00'),(78,6,7,'Trabalhando nos ajustes solicitados.',9,'2025-07-31 09:00:00'),(79,3,3,'Projeto iniciado.',3,'2025-07-01 09:00:00'),(80,3,3,'Projeto cancelado. Cliente suspendeu investimento.',15,'2025-07-10 11:00:00'),(81,8,2,'Briefing recebido, iniciando design.',6,'2025-07-14 09:00:00'),(82,8,6,'Iniciando desenvolvimento das peças.',6,'2025-07-15 10:00:00'),(83,2,3,'Reunião agendada.',2,'2025-07-01 09:00:00'),(84,2,3,'Iniciando briefing. Cliente com agenda apertada.',3,'2025-07-10 11:00:00'),(85,2,3,'Ainda aguardando retorno do cliente para fechar o briefing.',3,'2025-07-18 14:00:00'),(86,5,1,'Briefing finalizado.',4,'2025-07-08 10:00:00'),(87,5,7,'Iniciando gravações.',6,'2025-07-09 09:00:00'),(88,5,7,'Gravação finalizada. Iniciando edição.',6,'2025-07-16 17:00:00'),(89,5,7,'Edição finalizada com qualidade. Processo foi longo mas sem retrabalho.',7,'2025-07-24 18:00:00'),(90,5,1,'Social aprovou. Enviando ao cliente.',8,'2025-07-25 10:00:00'),(91,5,1,'Cliente aprovou sem nenhum ajuste.',12,'2025-07-27 11:00:00'),(92,5,1,'Publicado.',13,'2025-07-29 09:00:00'),(93,7,2,'Demanda urgente. Briefing alinhado por WhatsApp.',4,'2025-07-12 08:30:00'),(94,7,5,'Post criado em 2h.',6,'2025-07-14 10:00:00'),(95,7,2,'Social aprovou. Enviando ao cliente.',8,'2025-07-14 12:00:00'),(96,7,2,'Cliente aprovou em menos de 1h.',12,'2025-07-14 13:00:00'),(97,7,2,'Publicado imediatamente.',14,'2025-07-17 09:00:00');
/*!40000 ALTER TABLE `notificacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projeto`
--

DROP TABLE IF EXISTS `projeto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projeto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` int NOT NULL,
  `status_id` int NOT NULL,
  `frequencia_id` int NOT NULL,
  `etapa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `projeto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Categoria: Design, Audiovisual, Planejamento e Design...',
  `estimativa` decimal(5,2) DEFAULT NULL COMMENT 'Horas estimadas',
  `data_inicio` date DEFAULT NULL,
  `data_criacao` date NOT NULL,
  `data_modificacao` date NOT NULL,
  `data_vencimento` date NOT NULL,
  `data_conclusao` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projeto_cliente` (`cliente_id`),
  KEY `idx_projeto_status` (`status_id`),
  KEY `idx_projeto_frequencia` (`frequencia_id`),
  CONSTRAINT `fk_projeto_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `cliente` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_projeto_frequencia` FOREIGN KEY (`frequencia_id`) REFERENCES `frequencia` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_projeto_status` FOREIGN KEY (`status_id`) REFERENCES `status` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Um projeto por cliente por mês; várias frentes convivem nele.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projeto`
--

LOCK TABLES `projeto` WRITE;
/*!40000 ALTER TABLE `projeto` DISABLE KEYS */;
INSERT INTO `projeto` VALUES (1,'[JULHO] Plano de Conteúdo Mensal + Stories Semana 2',1,14,2,'Produção','Planejamento e Design + Design',5.00,'2025-07-01','2025-07-01','2025-07-28','2025-07-30',NULL),(2,'[JULHO] Carrossel Dicas Saúde + Conteúdo Educativo Instagram',2,13,3,'Briefing','Design + Planejamento e Design',7.00,'2025-07-01','2025-07-01','2025-07-29','2025-07-30',NULL),(3,'[JULHO] Reels Lançamento Produto',3,12,3,'Agendamento','Audiovisual',8.00,'2026-07-01','2026-07-01','2026-07-02','2026-07-30',NULL),(4,'[JULHO] Stories Campanha Promoção',4,9,3,'Revisão','Design',3.00,'2025-07-01','2025-07-01','2025-07-31','2025-07-30',NULL),(5,'[JULHO] Feed Institucional + Vídeo Depoimento Clientes',5,13,3,'Produção','Design + Audiovisual',12.00,'2025-07-01','2025-07-01','2025-07-29','2025-07-30','2025-07-29'),(6,'[JULHO] Vídeo Institucional + Campanha Dia dos Pais',6,9,4,'Revisão','Audiovisual',22.00,'2025-07-01','2025-07-01','2025-07-31','2025-07-30',NULL),(7,'[JULHO] Planejamento Trimestral + Post Promoção Relâmpago',7,13,3,'Retenção','Planejamento e Design + Design',6.50,'2025-07-01','2025-07-01','2025-07-29','2025-07-30','2025-07-29'),(8,'[JULHO] Post Evento Especial + Feed Semanal Semana 3',8,8,2,'Produção','Planejamento e Design + Design',4.00,'2025-07-01','2025-07-01','2025-07-31','2025-07-30',NULL);
/*!40000 ALTER TABLE `projeto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projeto_funcionario`
--

DROP TABLE IF EXISTS `projeto_funcionario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projeto_funcionario` (
  `projeto_id` int NOT NULL,
  `funcionario_id` int NOT NULL,
  PRIMARY KEY (`projeto_id`,`funcionario_id`),
  KEY `idx_pf_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_pf_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pf_projeto` FOREIGN KEY (`projeto_id`) REFERENCES `projeto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Associação entre projetos e a equipe que trabalha neles.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projeto_funcionario`
--

LOCK TABLES `projeto_funcionario` WRITE;
/*!40000 ALTER TABLE `projeto_funcionario` DISABLE KEYS */;
INSERT INTO `projeto_funcionario` VALUES (1,1),(5,1),(6,1),(3,2),(4,2),(6,2),(7,2),(8,2),(2,3),(3,3),(7,3),(8,3),(2,4),(7,4),(1,5),(4,5),(5,5),(7,5),(1,6),(8,6),(3,7),(5,7),(6,7);
/*!40000 ALTER TABLE `projeto_funcionario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projeto_status`
--

DROP TABLE IF EXISTS `projeto_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projeto_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projeto_id` int NOT NULL,
  `funcionario_id` int NOT NULL,
  `status_id` int NOT NULL,
  `data` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `projeto_id` (`projeto_id`),
  KEY `funcionario_id` (`funcionario_id`),
  KEY `status_id` (`status_id`),
  CONSTRAINT `projeto_status_ibfk_1` FOREIGN KEY (`projeto_id`) REFERENCES `projeto` (`id`),
  CONSTRAINT `projeto_status_ibfk_2` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario` (`id`),
  CONSTRAINT `projeto_status_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `status` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projeto_status`
--

LOCK TABLES `projeto_status` WRITE;
/*!40000 ALTER TABLE `projeto_status` DISABLE KEYS */;
INSERT INTO `projeto_status` VALUES (128,1,1,2,'2025-07-01 09:00:00'),(129,1,1,4,'2025-07-07 10:00:00'),(130,1,5,6,'2025-07-10 09:00:00'),(131,1,5,7,'2025-07-14 16:00:00'),(132,1,1,8,'2025-07-15 10:00:00'),(133,1,1,12,'2025-07-17 11:00:00'),(134,1,1,14,'2025-07-28 09:00:00'),(135,5,1,4,'2025-07-06 10:00:00'),(136,5,5,6,'2025-07-07 09:00:00'),(137,5,5,7,'2025-07-11 15:00:00'),(138,5,1,8,'2025-07-12 10:00:00'),(139,5,1,12,'2025-07-14 09:00:00'),(140,5,1,13,'2025-07-22 10:00:00'),(141,6,1,4,'2025-07-05 10:00:00'),(142,6,7,6,'2025-07-07 09:00:00'),(143,6,7,7,'2025-07-14 17:00:00'),(144,6,1,8,'2025-07-15 10:00:00'),(145,6,1,12,'2025-07-16 11:00:00'),(146,6,1,13,'2025-07-23 09:00:00'),(147,4,2,4,'2025-07-09 10:00:00'),(148,4,5,6,'2025-07-12 09:00:00'),(149,4,5,7,'2025-07-15 16:00:00'),(150,4,2,8,'2025-07-16 10:00:00'),(151,4,2,9,'2025-07-18 14:00:00'),(152,4,5,7,'2025-07-20 16:00:00'),(153,4,2,8,'2025-07-21 10:00:00'),(154,4,2,9,'2025-07-23 15:00:00'),(155,4,5,7,'2025-07-25 17:00:00'),(156,4,2,8,'2025-07-26 10:00:00'),(157,4,2,9,'2025-07-31 11:00:00'),(158,3,2,4,'2025-07-08 10:00:00'),(159,3,7,6,'2025-07-09 09:00:00'),(160,3,7,7,'2025-07-14 17:00:00'),(161,3,2,8,'2025-07-15 10:00:00'),(162,3,2,9,'2025-07-17 14:00:00'),(163,3,7,7,'2025-07-19 16:00:00'),(164,3,2,8,'2025-07-20 10:00:00'),(165,3,2,9,'2025-07-22 15:00:00'),(166,3,7,7,'2025-07-24 17:00:00'),(167,3,2,8,'2025-07-25 10:00:00'),(168,3,2,12,'2025-07-28 11:00:00'),(169,2,3,2,'2025-07-01 09:00:00'),(170,2,3,3,'2025-07-03 11:00:00'),(171,2,3,4,'2025-07-10 16:00:00'),(172,2,4,6,'2025-07-11 09:00:00'),(173,2,4,7,'2025-07-23 18:00:00'),(174,2,3,8,'2025-07-24 10:00:00'),(175,2,3,12,'2025-07-26 09:00:00'),(176,2,3,13,'2025-07-29 10:00:00'),(177,8,3,2,'2025-07-01 09:00:00'),(178,8,3,3,'2025-07-08 10:00:00'),(179,8,3,3,'2025-07-15 11:00:00'),(180,8,3,4,'2025-07-18 14:00:00'),(181,8,6,6,'2025-07-19 09:00:00'),(182,8,6,7,'2025-07-22 16:00:00'),(183,8,3,9,'2025-07-23 10:00:00'),(184,8,6,7,'2025-07-25 15:00:00'),(185,8,3,9,'2025-07-26 10:00:00'),(186,8,6,7,'2025-07-28 14:00:00'),(187,8,3,8,'2025-07-31 09:00:00'),(188,7,3,2,'2025-07-01 09:00:00'),(189,7,3,3,'2025-07-04 10:00:00'),(190,7,3,4,'2025-07-16 15:00:00'),(191,7,4,6,'2025-07-17 09:00:00'),(192,7,4,7,'2025-07-21 16:00:00'),(193,7,3,8,'2025-07-22 10:00:00'),(194,7,3,12,'2025-07-24 11:00:00'),(195,7,3,13,'2025-07-29 09:00:00'),(196,1,1,4,'2025-07-08 09:00:00'),(197,1,6,5,'2025-07-14 10:00:00'),(198,6,2,4,'2025-07-09 10:00:00'),(199,6,7,6,'2025-07-10 09:00:00'),(200,6,7,7,'2025-07-18 18:00:00'),(201,6,2,9,'2025-07-20 10:00:00'),(202,6,7,7,'2025-07-24 16:00:00'),(203,6,2,8,'2025-07-25 10:00:00'),(204,6,2,9,'2025-07-28 14:00:00'),(205,6,7,9,'2025-07-31 09:00:00'),(206,3,3,3,'2025-07-01 09:00:00'),(207,3,3,15,'2025-07-10 11:00:00'),(208,8,2,6,'2025-07-14 09:00:00'),(209,8,6,6,'2025-07-15 10:00:00'),(210,2,3,2,'2025-07-01 09:00:00'),(211,2,3,3,'2025-07-10 11:00:00'),(212,2,3,3,'2025-07-18 14:00:00'),(213,5,1,4,'2025-07-08 10:00:00'),(214,5,7,6,'2025-07-09 09:00:00'),(215,5,7,6,'2025-07-16 17:00:00'),(216,5,7,7,'2025-07-24 18:00:00'),(217,5,1,8,'2025-07-25 10:00:00'),(218,5,1,12,'2025-07-27 11:00:00'),(219,5,1,13,'2025-07-29 09:00:00'),(220,7,2,4,'2025-07-12 08:30:00'),(221,7,5,6,'2025-07-14 10:00:00'),(222,7,2,8,'2025-07-14 12:00:00'),(223,7,2,12,'2025-07-14 13:00:00'),(224,7,2,14,'2025-07-17 09:00:00');
/*!40000 ALTER TABLE `projeto_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `status`
--

DROP TABLE IF EXISTS `status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `status` (
  `id` int NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_status_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Estados do fluxo (A fazer ... Finalizado/Cancelado).';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `status`
--

LOCK TABLES `status` WRITE;
/*!40000 ALTER TABLE `status` DISABLE KEYS */;
INSERT INTO `status` VALUES (1,'A Fazer'),(5,'Aguardando Materiais'),(10,'Ajustes'),(13,'Aprovado'),(3,'Briefing em Construção'),(4,'Briefing Finalizado'),(15,'Cancelado'),(12,'Em Agendamento'),(9,'Em Alteração'),(8,'Em Aprovação'),(6,'Em Desenvolvimento'),(14,'Finalizado'),(11,'Pronto para Agendamento'),(7,'Pronto para Aprovação'),(2,'Reunião Agendada');
/*!40000 ALTER TABLE `status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_projeto_saude`
--

DROP TABLE IF EXISTS `vw_projeto_saude`;
/*!50001 DROP VIEW IF EXISTS `vw_projeto_saude`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_projeto_saude` AS SELECT 
 1 AS `id`,
 1 AS `nome`,
 1 AS `cliente_id`,
 1 AS `status_id`,
 1 AS `data_vencimento`,
 1 AS `dt_finalizado`,
 1 AS `dt_ultima_nao_final`,
 1 AS `qtd_alteracoes`,
 1 AS `categoria`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_status_tempo`
--

DROP TABLE IF EXISTS `vw_status_tempo`;
/*!50001 DROP VIEW IF EXISTS `vw_status_tempo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_status_tempo` AS SELECT 
 1 AS `id`,
 1 AS `projeto_id`,
 1 AS `data`,
 1 AS `alteracao_status_id`,
 1 AS `status_id`,
 1 AS `proxima_data`,
 1 AS `dias_ate_proxima`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_projeto_saude`
--

/*!50001 DROP VIEW IF EXISTS `vw_projeto_saude`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_projeto_saude` AS select `m`.`id` AS `id`,`m`.`nome` AS `nome`,`m`.`cliente_id` AS `cliente_id`,`m`.`status_id` AS `status_id`,`m`.`data_vencimento` AS `data_vencimento`,`m`.`dt_finalizado` AS `dt_finalizado`,`m`.`dt_ultima_nao_final` AS `dt_ultima_nao_final`,`m`.`qtd_alteracoes` AS `qtd_alteracoes`,(case when (`m`.`status_id` = 15) then 'cancelado' when ((0 <> coalesce((`m`.`dt_finalizado` > `m`.`data_vencimento`),0)) or (0 <> coalesce((`m`.`dt_ultima_nao_final` > `m`.`data_vencimento`),0)) or ((`m`.`dt_finalizado` is null) and (now() > `m`.`data_vencimento`)) or (`m`.`qtd_alteracoes` >= 3)) then 'critico' when (`m`.`qtd_alteracoes` = 2) then 'em_alerta' else 'saudavel' end) AS `categoria` from (select `p`.`id` AS `id`,`p`.`nome` AS `nome`,`p`.`cliente_id` AS `cliente_id`,(case when (`p`.`status_id` = 15) then `p`.`status_id` else (select `n2`.`alteracao_status_id` from `notificacao` `n2` where (`n2`.`projeto_id` = `p`.`id`) order by `n2`.`data` desc limit 1) end) AS `status_id`,`p`.`data_vencimento` AS `data_vencimento`,max((case when (`n`.`alteracao_status_id` in (13,14)) then cast(`n`.`data` as date) end)) AS `dt_finalizado`,max((case when ((`n`.`alteracao_status_id` not in (13,14)) or (`n`.`alteracao_status_id` is null)) then cast(`n`.`data` as date) end)) AS `dt_ultima_nao_final`,sum((case when (`n`.`alteracao_status_id` = 9) then 1 else 0 end)) AS `qtd_alteracoes` from (`projeto` `p` left join `notificacao` `n` on((`n`.`projeto_id` = `p`.`id`))) group by `p`.`id`,`p`.`nome`,`p`.`cliente_id`,`p`.`status_id`,`p`.`data_vencimento`) `m` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_status_tempo`
--

/*!50001 DROP VIEW IF EXISTS `vw_status_tempo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_status_tempo` AS select `n`.`id` AS `id`,`n`.`projeto_id` AS `projeto_id`,`n`.`data` AS `data`,`n`.`alteracao_status_id` AS `alteracao_status_id`,lag(`n`.`alteracao_status_id`) OVER (PARTITION BY `n`.`projeto_id` ORDER BY `n`.`data`,`n`.`id` )  AS `status_id`,lead(`n`.`data`) OVER (PARTITION BY `n`.`projeto_id` ORDER BY `n`.`data`,`n`.`id` )  AS `proxima_data`,(to_days(lead(`n`.`data`) OVER (PARTITION BY `n`.`projeto_id` ORDER BY `n`.`data`,`n`.`id` ) ) - to_days(`n`.`data`)) AS `dias_ate_proxima` from `notificacao` `n` order by `n`.`projeto_id`,`n`.`data`,`n`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-08 23:06:05

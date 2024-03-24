<?php
include("database.php");

$fecha_hoy = date('Y-m-d');
//$fecha_hoy = '2023-12-15';

?>

<!DOCTYPE html>
<html>

<head>
	<title>Dashboard - Biodiagnostico</title>

	<style>
		body {
			margin-top: 0;
			margin-left: 0;
			margin-right: 0;
			margin-bottom: 0;
			padding: 0;
			background-image: url("Imagen1.png");
			background-color: #cccccc;
		}

		@font-face {
			font-family: CoreRhino;
			src: url(CoreRhino45Regular.otf);
		}

		.container {
			width: 95%;
			height: 90%;
			background: #ffffff;
			border-radius: 5;
			/* regular */
			background: rgba(255, 255, 255, 0.7);
			padding: 20px;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			position: absolute;
			-ms-transform: translateY(-50%);
			-moz-border-radius: 25px;
			/* for Firefox */
			-webkit-border-radius: 25px;
			/* for Webkit-Browsers */
			font-family: CoreRhino;
			#box-shadow: -10px 10px 5px #aaaaaa;
		}

		h1 {
			color: #2031aa;
			text-align: center;
		}

		h2 {
			color: #2031aa;
			text-align: center;
		}

		h3 {
			color: #2031aa;
			font-size: 0.95em;
			text-align: center;
		}

		h4 {
			color: #2031aa;
			font-size: 0.8em;
			text-align: center;
		}

		.data {
			-moz-border-radius: 10px;
			/* for Firefox */
			-webkit-border-radius: 10px;
			/* for Webkit-Browsers */
			border-radius: 10;
			/* regular */
			border: 1px solid #ffffff;
			margin: 5px;
			padding: 5px;
			background: #ffffff;
			opacity: 0.7;
			font-size: 1em;
			#box-shadow: -1px 2px 2px #dddddd;
		}


		/* Next & previous buttons */
		.prev,
		.next {
			cursor: pointer;
			position: absolute;
			top: 50%;
			width: auto;
			padding: 16px;
			margin-top: -22px;
			color: white;
			font-weight: bold;
			font-size: 18px;
			transition: 0.6s ease;
			border-radius: 0 3px 3px 0;
			user-select: none;
		}

		/* Position the "next button" to the right */
		.next {
			right: 0;
			border-radius: 3px 0 0 3px;
		}

		/* Position the "prev button" to the left */
		.prev {
			left: 0;
			border-radius: 3px 0 0 3px;
		}

		/* On hover, add a grey background color */
		.prev:hover,
		.next:hover {
			background-color: #f1f1f1;
			color: black;
		}
	</style>


</head>

<body bgcolor="#cfcfcf">

	<div class="container">

		<div>
			<img src="Imagen2.png" align="left">
		</div>


		<div style="position: absolute; 
				bottom:20px; 
				padding: 10px; 
				text-align:right;
				width: 970px;
				height: 600px;
				left: 220px;
				" class='data'>

			<div class="mySlides">


				<h2>PRODUCTOS PR&Oacute;XIMOS A VENCER</h2>
				<TABLE width="100%" class='data' align="center">
					<?
					mssql_select_db('DB_BioProduccion')
						or die('Error al conectar con MSSQL.');

					$consulta = "
				SELECT top 20 T0.[ItemCode], T0.[ItemName],  T0.[Quantity],T0.[BatchNum],   T0.[ExpDate] 
				FROM [dbo].[OIBT]  T0 
				WHERE T0.[Quantity] > 0 
				AND DATEDIFF(dd, getdate(), T0.[ExpDate]) < 20 and WhsCode = '01' 
				and T0.[ExpDate] >= getdate()
				ORDER BY T0.[ExpDate]
				;";

					$resultado = mssql_query($consulta)
						or die('A error occured: ' . mssql_get_last_message());



					?>
					<tr>
						<th align="left">C&Oacute;DIGO</th>
						<th align="center">ART&Iacute;CULO</th>
						<th align="center">CANT</th>
						<th align="center">LOTE</th>
						<th align="center">VENCIMIENTO</th>
					</tr>

					<?
					while ($filas = mssql_fetch_assoc($resultado)) {
						$ItemCode = $filas['ItemCode'];
						$ItemName =  utf8_encode($filas['ItemName']);
						$Quantity = number_format($filas['Quantity'], 0, '', '');
						$BatchNum = $filas['BatchNum'];
						$ExpDate = substr($filas['ExpDate'], 0, 11);

						echo "<tr>";
						echo "<td align='left' valign='top'>$ItemCode</td>";
						echo "<td align='left' valign='top'>$ItemName</td>";
						echo "<td align='right' valign='top'>$Quantity</td>";
						echo "<td align='right' valign='top'>$BatchNum</td>";
						echo "<td align='right' valign='top'>$ExpDate</td>";
						echo "</tr>";
					}

					?>

				</table>

				<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
				<a class="next" onclick="plusSlides(1)">&#10095;</a>
			</div>

			<div class="mySlides">
				<h2>IMPORTACIONES</h2>
				<center>
					<table border=0 class='data' width="60%">
						<tr>
							<th colspan=2 ALIGN='left'>
								<h3>PRODUCTOS</h3>
							</th>
						</tr>
						<tr>
							<td ALIGN='left'><b>PROVEEDOR</b></td>
							<td ALIGN='center'><b>ARRIBO</b></td>
						</tr>
						<?
						mssql_select_db('DB_BioProduccion')
							or die('Error al conectar con MSSQL.');

						$SQL1 = "
				select CardName, OPOR.U_FEENV
				from POR1 
				inner join OPOR on OPOR.DocEntry = POR1.DocEntry
				where LineStatus <> 'C' and DocStatus <> 'C'  and OPOR.U_Status = 'V' and (OPOR.U_FEENV >= '$fecha_hoy' OR OPOR.U_FEENV is NULL) and OPOR.NumAtCard not like '%equipo%'
				group by CardName, OPOR.U_FEENV
				order by OPOR.U_FEENV asc
				";

						$result1 = mssql_query($SQL1)
							or die('A error occured: ' . mssql_get_last_message());

						while ($Row1 = mssql_fetch_assoc($result1)) {
							$CardName = utf8_encode($Row1['CardName']);
							$Arribo = substr($Row1['U_FEENV'], 0, 11);

							echo "<tr><td ALIGN='left'>" . $CardName . " </td><td align='right'> " . $Arribo . "</td></tr>" . "\n";
						}

						?>
						<tr>
							<th colspan=2>
								<h3>EQUIPOS</h3>
							</th>
						</tr>
						<tr>
							<td ALIGN='left'><b>PROVEEDOR</b></td>
							<td ALIGN='left'><b>ARRIBO</b></td>
						</tr>
						<?
						mssql_select_db('DB_BioProduccion')
							or die('Error al conectar con MSSQL.');

						$SQL1 = "
				select CardName, OPOR.U_FEENV
				from POR1 
				inner join OPOR on OPOR.DocEntry = POR1.DocEntry
				where LineStatus <> 'C' and DocStatus <> 'C'  and OPOR.U_Status = 'V' and (OPOR.U_FEENV >= '$fecha_hoy' OR OPOR.U_FEENV is NULL) and OPOR.NumAtCard like '%equipo%'
				group by CardName, OPOR.U_FEENV
				order by OPOR.U_FEENV asc
				";

						$result1 = mssql_query($SQL1)
							or die('A error occured: ' . mssql_get_last_message());

						while ($Row1 = mssql_fetch_assoc($result1)) {
							$CardName = utf8_encode($Row1['CardName']);
							$Arribo = substr($Row1['U_FEENV'], 0, 11);

							echo "<tr><td ALIGN='left'>" . $CardName . " </td><td align='right'> " . $Arribo . "</td></tr>" . "\n";
						}

						?>
					</table>
				</center>
				<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
				<a class="next" onclick="plusSlides(1)">&#10095;</a>
			</div>

			<div class="mySlides">
				<h2>PR&Oacute;XIMAS INSTALACIONES</h2>
				<table border=0 class='data' width="100%">
					<tH ALIGN='left'>DESCRIPCI&Oacute;N</tH>
					<TH ALIGN='left'>ENAXIS</tH>
					<tH ALIGN='left'>CONFIRMADO</tH>

					<?
					mssql_select_db('ENAXISDB')
						or die('Error al conectar con MSSQL.');


					$SQL2 = "
			SELECT NCMAINPROD.INPUTFECHA, NCMAINPROD.DESCRIPCION, NCMAINPROD.CODIGO AS ENAXIS,
			(SELECT CUMPLIMIENTO FROM NCTAREAS WHERE DESCRIPCION LIKE 'COMERCIAL' AND CODIGONC = NCMAINPROD.CODIGO) AS FECHA
			FROM NCMAINPROD
			INNER JOIN NCTAREAS ON NCMAINPROD.CODIGO = NCTAREAS.CODIGONC
			WHERE 
			   NCMAINPROD.CODIGO IN (SELECT CODIGONC FROM NCTAREAS WHERE DESCRIPCION LIKE 'POSVENTA' AND L_CUMPLIDA = 0)
			and NCMAINPROD.CODIGO IN (SELECT CODIGONC FROM NCTAREAS WHERE DESCRIPCION LIKE 'COMERCIAL' AND L_CUMPLIDA = 1)
			GROUP BY NCMAINPROD.INPUTFECHA, NCMAINPROD.DESCRIPCION, NCMAINPROD.CODIGO
			ORDER BY INPUTFECHA ASC
			";

					$result2 = mssql_query($SQL2)
						or die('Ha ocurrido un error al consultar la base de datos: ' . mssql_get_last_message());

					//$i=0;
					//$cant_filas = 4;
					while ($Row2 = mssql_fetch_assoc($result2)) {

						// if ($i==$cant_filas){
						echo "<tr>";
						//$i=0;
						//}

						echo "<td valign='top' ALIGN='left'>" . utf8_encode($Row2['DESCRIPCION']) . "</td><td valign='top' ALIGN='left'>" . "N-" . $Row2['ENAXIS'] . "</td><td valign='top' ALIGN='left'>" . substr($Row2['FECHA'], 0, 11) . "</td>" . "\n";
						// if ($i==$cant_filas){
						echo "<tr>";
						//$i=0;
						//}

						//		$i++;
					}
					?>
				</table>

			</div>
			<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
			<a class="next" onclick="plusSlides(1)">&#10095;</a>
		</div>


		<script>
			var slideIndex = 0;
			carousel(0);

			function carousel(n) {
				var i;
				var x = document.getElementsByClassName("mySlides");
				for (i = 0; i < x.length; i++) {
					x[i].style.display = "none";
				}
				slideIndex++;
				if (slideIndex > x.length) {
					slideIndex = 1;
					location.reload();
				}
				x[slideIndex - 1].style.display = "block";
				setTimeout(carousel, 90000);
			}

			function plusSlides(n) {
				carousel(n);
			}
		</script>












		<!--
	<div style="position: absolute; 
				right: 20px; 
				padding: 10px; 
				text-align:left; 
				background-image: url('icons8-plane-64.png');  
				background-repeat: no-repeat;  
				background-attachment: fixed;  
				background-position: center; 
				background-size: 150px 150px; 
				max-width: 500px;
				"
				class='data';>
	
	</div>
	-->

		<div style="position: absolute; 
				padding: 10px; 
				text-align:right; 
				top:120px;
				width: 150px;
				" class='data' align="left">

			<h3>ENTREGAS<br>PARA HOY</h3>
			<?

			$ayer = date("Y-m-d", strtotime($fecha_hoy . "- 1 day"));
			//$ayer = strtotime('-1 day', strtotime($fecha_hoy));
			//$ayer = date('Y-m-d', $ayer);
			$SQL_entregas = "
		select id_estado, estado, count(*) as cant
		from
		entregas.entregas_sap inner join entregas.estados on entregas_sap.id_estado = estados.id
		where date(fecha_ultimo_estado) = '$fecha_hoy' and CardCode <> 'C0139'
		group by id_estado, estado
	";

			if ($result_entregas = mysqli_query($link, $SQL_entregas)) {

				while ($Row_entregas = mysqli_fetch_assoc($result_entregas)) {
					$id_estado = ($Row_entregas['id_estado']);
					if ($id_estado == 1) {
						$exped_icon = 'icons8-trolley-64.png';
					} else if ($id_estado == 2) {
						$exped_icon = 'icons8-in-transit-64.png';
					} else if ($id_estado == 3) {
						$exped_icon = 'icons8-thumbs-up-64.png';
					} else if ($id_estado == 4) {
						$exped_icon = 'icons8-reject-64.png';
					} else if ($id_estado == 5) {
						$exped_icon = 'icons8-supplier-64.png';
					}

					echo "<div>";
					echo "<img src='" . $exped_icon . "' style = 'height:1.8em; vertical-align:middle;' align='left'>";
					echo "<font style = 'vertical-align:middle; font-size: 1.6em;'>" . $Row_entregas['cant'] . "</font>";
					echo "</div>";
				}
			}

			?>
		</div>

		<!--
	<div style="position: absolute; 
				top:380px; 
				padding: 10px; 
				text-align:right;
				width: 150px;"
				class='data'>
				
	<h3>LLAMADOS</h3>
	<?

	$consulta_llamadas = "
		select id from gastos.llamadas 
		where cerrada = 0 and hilo = 0
		";

	if ($result_cantllamadas = mysqli_query($link, $consulta_llamadas)) {
		$rowcount = mysqli_num_rows($result_cantllamadas);
		mysqli_free_result($result_cantllamadas);
	}

	$consulta_llamadas_sinresolucion = "
		select id from gastos.llamadas 
		where cerrada = 0 and hilo = 0 and resolucion = '' and comentario not like '%(TICKET):%' and comentario not like '%MPA%'
		";

	if ($result_cantllamadas_sinresolucion = mysqli_query($link, $consulta_llamadas_sinresolucion)) {
		$rowcount_sinresolucion = mysqli_num_rows($result_cantllamadas_sinresolucion);
		mysqli_free_result($result_cantllamadas_sinresolucion);
	}
	echo "<div>";
	echo "<img src='icons8-tools-64.png' style = 'height:2em; vertical-align:middle;' align='left'>";
	echo "<font style = 'vertical-align:middle; font-size: 1.8em;'>" . $rowcount . "</font>";
	echo "</div>";

	echo "<div>";
	echo "<img src='icons8-inquiry-64.png' style = 'height:2em; vertical-align:middle;' align='left'>";
	echo "<font style = 'vertical-align:middle; font-size: 1.8em;'>" . $rowcount_sinresolucion . "</font>";
	echo "</div>";

	?>
	</div>
	-->


		<!--
	<div style="position: absolute; 
				right: 560px; 
				padding: 10px; 
				text-align:left; 
				background-image: url('icons8-robot-2-64.png');  
				background-repeat: no-repeat;  
				background-attachment: fixed;  
				background-position: center; 
				background-size: 150px 150px; 
				max-width: 650px;
				"
				class='data';>
				
	
	</div>
	-->

		<div style="position: absolute; 
				bottom:20px; 
				padding: 10px; 
				text-align:right;
				width: 150px;" class='data'>

			<h3>CUMPLIMIENTO ENTREGAS</h3>
			<h4>(<? echo date('M-y'); ?>)</h4>
			<TABLE width="100%">
				<?
				$filtro_fechaini = date('Y-m-01');
				$filtro_fechafin = $fecha_hoy;
				$filtro_atrasoint = 2;
				$filtro_atrasomvd = 1;

				mssql_select_db('DB_BioProduccion')
					or die('Error al conectar con MSSQL.');

				$SQL_atrasos = "
	select count(1) as cant, Entrega from (

	select 
	ORDR.CardCode,
	ORDR.CardName,
	ORDR.DocNum,
	CASE 
	WHEN dbo.DiasHabiles(DATEADD(DAY, 1, CONVERT(DATE,ORDR.DocDueDate)), CASE WHEN ODLN.DocDate IS NULL THEN CONVERT(DATE,GETDATE()) ELSE CONVERT(DATE,ODLN.DocDate) END) > $filtro_atrasomvd and City like 'Montevideo' THEN 'Montevideo'
	WHEN dbo.DiasHabiles(DATEADD(DAY, 1, CONVERT(DATE,ORDR.DocDueDate)), CASE WHEN ODLN.DocDate IS NULL THEN CONVERT(DATE,GETDATE()) ELSE CONVERT(DATE,ODLN.DocDate) END) > $filtro_atrasoint and City not like 'Montevideo' THEN 'Interior'
	ELSE 'En fecha'	
	END as Entrega

	from ORDR
	inner join RDR1 on ORDR.DocEntry = RDR1.DocEntry
	inner join DLN1 on ORDR.DocNum = DLN1.BaseRef and RDR1.ItemCode = DLN1.ItemCode
	inner join ODLN on DLN1.DocEntry = ODLN.DocEntry
	inner join CRD1 on ORDR.CardCode = CRD1.CardCode

	where 
		CRD1.LineNum = 0
		and ODLN.Comments not like '%Documento creado por STAT-us%' 
		and ODLN.DocDueDate between '$filtro_fechaini' and '$filtro_fechafin'

	GROUP BY 
	ORDR.CardCode,
	ORDR.CardName,
	ORDR.DocNum,
	CASE 
	WHEN dbo.DiasHabiles(DATEADD(DAY, 1, CONVERT(DATE,ORDR.DocDueDate)), CASE WHEN ODLN.DocDate IS NULL THEN CONVERT(DATE,GETDATE()) ELSE CONVERT(DATE,ODLN.DocDate) END) > $filtro_atrasomvd and City like 'Montevideo' THEN 'Montevideo'
	WHEN dbo.DiasHabiles(DATEADD(DAY, 1, CONVERT(DATE,ORDR.DocDueDate)), CASE WHEN ODLN.DocDate IS NULL THEN CONVERT(DATE,GETDATE()) ELSE CONVERT(DATE,ODLN.DocDate) END) > $filtro_atrasoint and City not like 'Montevideo' THEN 'Interior'
	ELSE 'En fecha'	
	END



	) as pepe
	group by Entrega
	";

				$result_atrasos = mssql_query($SQL_atrasos)
					or die('A error occured: ' . mssql_get_last_message());

				while ($Row_atrasos = mssql_fetch_assoc($result_atrasos)) {
					$nombre_col = $Row_atrasos['Entrega'];
					$cant_col = $Row_atrasos['cant'];

					if ($nombre_col == 'En fecha') {
						$atraso_emoji = 'icons8-muscle-64.png';
						$en_fecha = $Row_atrasos['cant'];
					} else 	if ($nombre_col == 'Interior') {
						$atraso_emoji = 'icons8-sad-64.png';
						$atraso_int = $Row_atrasos['cant'];
					} else 	if ($nombre_col == 'Montevideo') {
						$atraso_emoji = 'icons8-sad-64.png';
						$atraso_mont = $Row_atrasos['cant'];
					}

					echo "<tr>";
					echo "<td><img src='$atraso_emoji' style = 'height:1.8em; vertical-align:middle;' align = 'left'></td>";
					echo "<td style='text-align:left'><font style = 'vertical-align:middle; font-size: 0.8em;'>" . $nombre_col . "</font></td>";
					echo "<td style='text-align:right'><font style = 'vertical-align:middle; font-size: 1.1em;'>" . $Row_atrasos['cant'] . "</font></td>";
					echo "</tr>";



					$a++;
				}

				$porcentaje_cumplimiento_entregas = number_format($en_fecha / ($atraso_int + $atraso_mont + $en_fecha) * 100, 0, '', '');
				// $porcentaje_cumplimiento_entregas = 85;

				if ($porcentaje_cumplimiento_entregas >= 80) {
					$color_entregas = "green";
					$bgimg_entregas = 'style="text-align:center;background-image:url(icons8-whole-watermelon-64.png); background-repeat:no-repeat;"';
					$img_entregas = 'icons8-whole-watermelon-64.png';
				} else if ($porcentaje_cumplimiento_entregas < 80 && $porcentaje_cumplimiento_entregas >= 70) {
					$color_entregas = "orange";
					$bgimg_entregas = 'style="text-align:center;background-image:url(icons8-lemon-64.png); background-repeat:no-repeat;"';
					$img_entregas = 'icons8-lemon-64.png';
				} else if ($porcentaje_cumplimiento_entregas < 70) {
					$color_entregas = "red";
					$bgimg_entregas = 'style="text-align:center;background-image:url(icons8-chili-64.png); background-repeat:no-repeat;"';
					$img_entregas = 'icons8-chili-64.png';
				}
				echo "<thead><td colspan=3 align='center'><div class='image-container'><img src=" . $img_entregas . " style='width:100px;'><div class='overlay-text'>" . $porcentaje_cumplimiento_entregas . "%</div></div></td></thead>";
				?>
			</TABLE>
		</DIV>





	</div>






	<style>
		.overlay-text {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			color: #000000;
			padding: 10px 20px;
			font-size: 40px;
			text-align: center;
			text-shadow: 2px 2px 2px white;
		}

		.image-container {
			position: relative;
			display: inline-block;
		}

		.image-container img {
			display: block;
			width: 100%;
			height: auto;
		}
	</style>

	<!--
<script>
setTimeout(function(){
    location.reload();
}, 900000); // 1000 milliseconds = 1 seconds
</script>
-->
</body>

</html>
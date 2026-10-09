-- whjrscbmanage 数据层存储过程
-- 用于 React 加壳前端调用（/api/data → CALL sp_xxx）完成写库。
-- 可重复执行（DROP + CREATE）。

DROP PROCEDURE IF EXISTS sp_upper_storage_config_update;
DELIMITER $$
CREATE PROCEDURE sp_upper_storage_config_update(
  IN p_id INT,
  IN p_vat DECIMAL(12, 6),
  IN p_surcharge DECIMAL(12, 6),
  IN p_updater VARCHAR(50)
)
BEGIN
  UPDATE bus_upper_storage_config
     SET vat = p_vat,
         surcharge = p_surcharge,
         updater = p_updater,
         update_time = NOW()
   WHERE id = p_id;
  SELECT JSON_OBJECT('success', TRUE, 'message', '保存成功') AS result;
END$$
DELIMITER ;
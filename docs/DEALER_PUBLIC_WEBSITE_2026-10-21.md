# ALSVID 经销商公开招商页与网点实施说明

公开路线：/{zh|de|en}/dealers（招商）、/{zh|de|en}/dealers/locations（销售）、/{zh|de|en}/service-locations（售后）。经销商工作台仍为 dealer.alsvidbike.com。

业务记录：partners.dealer_applications 仅承接线索，不自动生成经销商角色或商业授权。系统按邮箱对重复申请进行限制，使用幂等请求、字段大小和 honeypot 控制。管理员在 /admin/dealers/applications 查阅、联系并设置审核状态。

公开门店：partners.public_locations 只返回已核验、审核发布、授权仍有效的销售或维修站点，不能将申请转化为自动授权。无真实门店则为空状态，接口断线单独显示错误。

运营注意：实际授权网点尚需从内部资料核实并发布。欧洲用户个人信息收集前需经营主体审核隐私告知、保留期限、联系和删除渠道以及跨境数据合规。

验证说明：Browser CI 采用模拟提交，绝不向生产系统写入测试申请。数据库迁移及线上真实提交必须单独验收；不得以 PR/CI 通过冒充生产可用。
